use anchor_lang::prelude::*;

#[error_code]
pub enum TrustPayError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Text field is empty")]
    EmptyText,
    #[msg("Text field exceeds its maximum length")]
    TextTooLong,
    #[msg("Window is outside the configured bounds")]
    WindowOutOfBounds,
    #[msg("Window bounds are invalid")]
    InvalidWindowBounds,
    #[msg("Order is not in a state that allows this action")]
    InvalidStatus,
    #[msg("Order is reserved for a different buyer")]
    NotReservedBuyer,
    #[msg("Buyer and vendor must be different wallets")]
    SelfDealing,
    #[msg("Arbiter cannot be a party to the order")]
    ArbiterConflict,
    #[msg("Shipping deadline has passed")]
    ShipDeadlinePassed,
    #[msg("Shipping deadline has not passed yet")]
    ShipDeadlineNotReached,
    #[msg("Dispute window has closed")]
    DisputeWindowClosed,
    #[msg("Funds are not yet due for automatic release")]
    ReleaseNotYetDue,
    #[msg("Split must be between 0 and 10000 basis points")]
    InvalidBps,
    #[msg("Order id must equal the vendor's next sequential id")]
    UnexpectedOrderId,
    #[msg("Signer is not the program upgrade authority")]
    NotUpgradeAuthority,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
