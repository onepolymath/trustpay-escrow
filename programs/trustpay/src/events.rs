//! Events emitted on every state transition. Indexers can rebuild full order history from these.
use anchor_lang::prelude::*;

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub arbiter: Pubkey,
    pub min_window_secs: i64,
    pub max_window_secs: i64,
}

#[event]
pub struct VendorRegistered {
    pub vendor: Pubkey,
    pub handle: String,
}

#[event]
pub struct OrderCreated {
    pub order: Pubkey,
    pub vendor: Pubkey,
    pub order_id: u64,
    pub mint: Pubkey,
    pub amount: u64,
    pub reserved_buyer: Option<Pubkey>,
}

#[event]
pub struct OrderFunded {
    pub order: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
    pub ship_by: i64,
}

#[event]
pub struct OrderShipped {
    pub order: Pubkey,
    pub tracking: String,
    pub release_after: i64,
}

#[event]
pub struct DisputeOpened {
    pub order: Pubkey,
    pub buyer: Pubkey,
    pub reason: String,
}

#[event]
pub struct OrderSettled {
    pub order: Pubkey,
    pub outcome: crate::state::OrderStatus,
    pub buyer_payout: u64,
    pub vendor_payout: u64,
    pub settled_by: Pubkey,
}

#[event]
pub struct OrderCancelled {
    pub order: Pubkey,
}
