//! Seeds and hard limits. Changing any seed is a breaking change for every client.

/// Seed for the singleton [`crate::state::Config`] PDA.
pub const CONFIG_SEED: &[u8] = b"config";
/// Seed prefix for a vendor's [`crate::state::VendorProfile`] PDA: `["vendor", vendor]`.
pub const VENDOR_SEED: &[u8] = b"vendor";
/// Seed prefix for an [`crate::state::Order`] PDA: `["order", vendor, order_id_le]`.
pub const ORDER_SEED: &[u8] = b"order";

pub const MAX_HANDLE_LEN: usize = 32;
pub const MAX_TITLE_LEN: usize = 64;
pub const MAX_TRACKING_LEN: usize = 64;
pub const MAX_REASON_LEN: usize = 160;

/// Basis-point denominator used for dispute splits.
pub const BPS_DENOMINATOR: u16 = 10_000;

/// Absolute bounds for any configurable window, regardless of what the admin sets.
/// The lower bound keeps the demo usable; production config should use hours or days.
pub const HARD_MIN_WINDOW_SECS: i64 = 60;
pub const HARD_MAX_WINDOW_SECS: i64 = 60 * 24 * 60 * 60;
