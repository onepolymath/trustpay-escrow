use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::TrustPayError;

/// Singleton protocol configuration.
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Can rotate the arbiter and tune window bounds. Should be a multisig in production.
    pub admin: Pubkey,
    /// Sole key allowed to rule on disputes. Should be a Squads multisig in production.
    pub arbiter: Pubkey,
    pub min_window_secs: i64,
    pub max_window_secs: i64,
    /// Total orders ever created, across all vendors.
    pub order_count: u64,
    pub bump: u8,
}

impl Config {
    pub fn check_window(&self, secs: i64) -> Result<()> {
        require!(
            secs >= self.min_window_secs && secs <= self.max_window_secs,
            TrustPayError::WindowOutOfBounds
        );
        Ok(())
    }
}

/// Validates admin-supplied window bounds against the hard protocol limits.
pub fn validate_window_bounds(min: i64, max: i64) -> Result<()> {
    require!(
        (HARD_MIN_WINDOW_SECS..=HARD_MAX_WINDOW_SECS).contains(&min)
            && (HARD_MIN_WINDOW_SECS..=HARD_MAX_WINDOW_SECS).contains(&max)
            && min <= max,
        TrustPayError::InvalidWindowBounds
    );
    Ok(())
}

/// Public, append-only reputation record for a vendor. Only this program can write it.
#[account]
#[derive(InitSpace)]
pub struct VendorProfile {
    pub vendor: Pubkey,
    /// Social handle the vendor sells under, e.g. `@ummie.styles`. Self-declared.
    #[max_len(MAX_HANDLE_LEN)]
    pub handle: String,
    /// Also the next sequential order id.
    pub orders_created: u64,
    /// Released to the vendor without a dispute (buyer confirmed or timeout elapsed).
    pub completed: u32,
    /// Vendor voluntarily refunded the buyer.
    pub refunded: u32,
    /// Vendor took payment but never marked the order shipped before the deadline.
    pub missed_shipments: u32,
    pub disputes_opened: u32,
    pub disputes_won: u32,
    pub disputes_lost: u32,
    /// Sum of raw token amounts paid out to the vendor (mixed mints are summed as-is).
    pub volume_settled: u64,
    pub created_at: i64,
    pub last_activity_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum OrderStatus {
    /// Vendor created the order link; no funds yet.
    Created,
    /// Buyer's funds are locked in the vault.
    Funded,
    /// Vendor marked the order shipped; the confirm window is running.
    Shipped,
    /// Buyer opened a dispute; funds are frozen until the arbiter rules.
    Disputed,
    /// Funds released to the vendor (buyer confirmed or timeout elapsed).
    Completed,
    /// Funds returned to the buyer (vendor refunded or missed the ship deadline).
    Refunded,
    /// Arbiter split the funds.
    Resolved,
    /// Vendor cancelled before funding.
    Cancelled,
}

impl OrderStatus {
    pub fn is_terminal(self) -> bool {
        matches!(
            self,
            OrderStatus::Completed
                | OrderStatus::Refunded
                | OrderStatus::Resolved
                | OrderStatus::Cancelled
        )
    }
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub vendor: Pubkey,
    /// `Pubkey::default()` until funded, unless the vendor reserved the order for one buyer.
    pub buyer: Pubkey,
    pub reserved_buyer: bool,
    pub mint: Pubkey,
    pub order_id: u64,
    pub amount: u64,
    pub status: OrderStatus,
    pub ship_window_secs: i64,
    pub confirm_window_secs: i64,
    pub created_at: i64,
    pub funded_at: i64,
    pub ship_by: i64,
    pub shipped_at: i64,
    pub release_after: i64,
    pub settled_at: i64,
    pub buyer_payout: u64,
    pub vendor_payout: u64,
    #[max_len(MAX_TITLE_LEN)]
    pub title: String,
    #[max_len(MAX_TRACKING_LEN)]
    pub tracking: String,
    #[max_len(MAX_REASON_LEN)]
    pub dispute_reason: String,
    pub bump: u8,
}

impl Order {
    /// The buyer may dispute while funds are locked and before the confirm window closes.
    /// Exactly disjoint from [`Order::can_auto_release`] so a dispute and an automatic release
    /// can never both be valid in the same slot.
    pub fn can_dispute(&self, now: i64) -> bool {
        match self.status {
            OrderStatus::Funded => true,
            OrderStatus::Shipped => now < self.release_after,
            _ => false,
        }
    }

    pub fn can_auto_release(&self, now: i64) -> bool {
        self.status == OrderStatus::Shipped && now >= self.release_after
    }

    pub fn can_reclaim_unshipped(&self, now: i64) -> bool {
        self.status == OrderStatus::Funded && now > self.ship_by
    }
}

/// Splits `total` between buyer and vendor. Rounds in the vendor's favour by at most one unit,
/// and always conserves the total.
pub fn split_payout(total: u64, buyer_bps: u16) -> Result<(u64, u64)> {
    require!(buyer_bps <= BPS_DENOMINATOR, TrustPayError::InvalidBps);
    let to_buyer = (total as u128)
        .checked_mul(buyer_bps as u128)
        .ok_or(TrustPayError::MathOverflow)?
        / BPS_DENOMINATOR as u128;
    let to_buyer = u64::try_from(to_buyer).map_err(|_| TrustPayError::MathOverflow)?;
    let to_vendor = total
        .checked_sub(to_buyer)
        .ok_or(TrustPayError::MathOverflow)?;
    Ok((to_buyer, to_vendor))
}

pub fn check_text(value: &str, max: usize, allow_empty: bool) -> Result<()> {
    require!(
        allow_empty || !value.trim().is_empty(),
        TrustPayError::EmptyText
    );
    require!(value.len() <= max, TrustPayError::TextTooLong);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn order(status: OrderStatus) -> Order {
        Order {
            vendor: Pubkey::new_unique(),
            buyer: Pubkey::new_unique(),
            reserved_buyer: false,
            mint: Pubkey::new_unique(),
            order_id: 0,
            amount: 1_000,
            status,
            ship_window_secs: 3_600,
            confirm_window_secs: 3_600,
            created_at: 0,
            funded_at: 10,
            ship_by: 3_610,
            shipped_at: 100,
            release_after: 3_700,
            settled_at: 0,
            buyer_payout: 0,
            vendor_payout: 0,
            title: String::new(),
            tracking: String::new(),
            dispute_reason: String::new(),
            bump: 255,
        }
    }

    #[test]
    fn split_conserves_total() {
        for total in [0u64, 1, 7, 999, 1_000_000, u64::MAX] {
            for bps in [0u16, 1, 3_333, 5_000, 9_999, 10_000] {
                let (b, v) = split_payout(total, bps).unwrap();
                assert_eq!(b.checked_add(v), Some(total), "total={total} bps={bps}");
            }
        }
    }

    #[test]
    fn split_extremes() {
        assert_eq!(split_payout(1_000, 0).unwrap(), (0, 1_000));
        assert_eq!(split_payout(1_000, 10_000).unwrap(), (1_000, 0));
        assert_eq!(split_payout(1_000, 2_500).unwrap(), (250, 750));
        // Odd unit rounds to the vendor.
        assert_eq!(split_payout(3, 5_000).unwrap(), (1, 2));
    }

    #[test]
    fn split_rejects_bps_over_100_percent() {
        assert!(split_payout(1_000, 10_001).is_err());
    }

    #[test]
    fn dispute_and_auto_release_are_disjoint_at_every_instant() {
        let o = order(OrderStatus::Shipped);
        for now in (o.release_after - 3)..=(o.release_after + 3) {
            assert_ne!(o.can_dispute(now), o.can_auto_release(now), "now={now}");
        }
    }

    #[test]
    fn funded_orders_can_be_disputed_but_not_auto_released() {
        let o = order(OrderStatus::Funded);
        assert!(o.can_dispute(i64::MAX));
        assert!(!o.can_auto_release(i64::MAX));
    }

    #[test]
    fn reclaim_only_after_ship_deadline() {
        let o = order(OrderStatus::Funded);
        assert!(!o.can_reclaim_unshipped(o.ship_by));
        assert!(o.can_reclaim_unshipped(o.ship_by + 1));
        assert!(!order(OrderStatus::Shipped).can_reclaim_unshipped(i64::MAX));
    }

    #[test]
    fn terminal_states_accept_nothing() {
        for s in [
            OrderStatus::Completed,
            OrderStatus::Refunded,
            OrderStatus::Resolved,
            OrderStatus::Cancelled,
        ] {
            let o = order(s);
            assert!(s.is_terminal());
            assert!(!o.can_dispute(0) && !o.can_auto_release(i64::MAX));
            assert!(!o.can_reclaim_unshipped(i64::MAX));
        }
    }

    #[test]
    fn window_bounds() {
        assert!(validate_window_bounds(60, 3_600).is_ok());
        assert!(validate_window_bounds(59, 3_600).is_err());
        assert!(validate_window_bounds(3_600, 60).is_err());
        assert!(validate_window_bounds(60, HARD_MAX_WINDOW_SECS + 1).is_err());
    }

    #[test]
    fn text_checks() {
        assert!(check_text("ok", 4, false).is_ok());
        assert!(check_text("   ", 4, false).is_err());
        assert!(check_text("", 4, true).is_ok());
        assert!(check_text("toolong", 4, true).is_err());
    }
}
