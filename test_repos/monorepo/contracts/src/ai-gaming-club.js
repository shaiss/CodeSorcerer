import { NearBindgen, call, view, initialize, near, LookupMap } from "near-sdk-js";

/**
 * AI Gaming Club Contract
 * 
 * A contract that allows users to deposit and withdraw NEAR and USDC tokens.
 * Includes admin functionality to lock user funds and adjust balances.
 * Emits events for all operations.
 */
@NearBindgen({ requireInit: true })
export class AIGamingClub {
  constructor() {
    // Maps to store user balances
    this.nearBalances = new LookupMap("near_balances");
    this.usdcBalances = new LookupMap("usdc_balances");
    
    // Maps to store locked status and amounts
    this.nearLocked = new LookupMap("near_locked");
    this.usdcLocked = new LookupMap("usdc_locked");
    
    // Admin account
    this.adminAccount = "";
    
    // USDC token contract address
    this.usdcTokenContract = "";
  }

  /**
   * Initialize the contract
   * @param admin_account - The account ID of the admin
   * @param usdc_token_contract - The account ID of the USDC token contract
   */
  @initialize({})
  init({ admin_account, usdc_token_contract }) {
    this.adminAccount = admin_account;
    this.usdcTokenContract = usdc_token_contract;
    
    // Log initialization event
    this._emitEvent("CONTRACT_INITIALIZED", {
      admin_account,
      usdc_token_contract,
      timestamp: this._getCurrentTimestamp()
    });
  }

  /**
   * Deposit NEAR tokens into the contract
   * Payable function that accepts NEAR tokens
   */
  @call({ payableFunction: true })
  depositNear() {
    const accountId = near.predecessorAccountId();
    const amount = near.attachedDeposit().toString();
    
    // Check if account is locked
    if (this._isNearLocked(accountId)) {
      throw new Error("Account is locked");
    }
    
    // Update balance
    const currentBalance = BigInt(this._getNearBalance(accountId));
    const newBalance = currentBalance + BigInt(amount);
    this.nearBalances.set(accountId, newBalance.toString());
    
    // Emit deposit event
    this._emitEvent("NEAR_DEPOSIT", {
      account_id: accountId,
      amount,
      new_balance: newBalance.toString(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return newBalance.toString();
  }

  /**
   * Withdraw NEAR tokens from the contract
   * @param amount - The amount of NEAR tokens to withdraw
   */
  @call({})
  withdrawNear({ amount }) {
    const accountId = near.predecessorAccountId();
    
    // Check if account is locked
    if (this._isNearLocked(accountId)) {
      throw new Error("Account is locked");
    }
    
    // Check if balance is sufficient
    const currentBalance = BigInt(this._getNearBalance(accountId));
    if (currentBalance < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }
    
    // Update balance
    const newBalance = currentBalance - BigInt(amount);
    this.nearBalances.set(accountId, newBalance.toString());
    
    // Transfer NEAR tokens
    const promise = near.promiseBatchCreate(accountId);
    near.promiseBatchActionTransfer(promise, BigInt(amount));
    
    // Emit withdrawal event
    this._emitEvent("NEAR_WITHDRAWAL", {
      account_id: accountId,
      amount,
      new_balance: newBalance.toString(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return newBalance.toString();
  }

  /**
   * Deposit USDC tokens into the contract
   * @param amount - The amount of USDC tokens to deposit
   */
  @call({})
  depositUsdc({ amount }) {
    const accountId = near.predecessorAccountId();
    
    // Check if account is locked
    if (this._isUsdcLocked(accountId)) {
      throw new Error("Account is locked");
    }
    
    // Call USDC contract to transfer tokens
    const promise = near.promiseBatchCreate(this.usdcTokenContract);
    const transferArgs = JSON.stringify({
      sender_id: accountId,
      amount: amount,
      msg: "Deposit to AI Gaming Club"
    });
    
    near.promiseBatchActionFunctionCall(
      promise,
      "ft_transfer_call",
      transferArgs,
      BigInt("1"), // Attached deposit for gas
      BigInt("30000000000000") // Gas
    );
    
    // Update balance after successful transfer
    const currentBalance = BigInt(this._getUsdcBalance(accountId));
    const newBalance = currentBalance + BigInt(amount);
    this.usdcBalances.set(accountId, newBalance.toString());
    
    // Emit deposit event
    this._emitEvent("USDC_DEPOSIT", {
      account_id: accountId,
      amount,
      new_balance: newBalance.toString(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return newBalance.toString();
  }

  /**
   * Withdraw USDC tokens from the contract
   * @param amount - The amount of USDC tokens to withdraw
   */
  @call({})
  withdrawUsdc({ amount }) {
    const accountId = near.predecessorAccountId();
    
    // Check if account is locked
    if (this._isUsdcLocked(accountId)) {
      throw new Error("Account is locked");
    }
    
    // Check if balance is sufficient
    const currentBalance = BigInt(this._getUsdcBalance(accountId));
    if (currentBalance < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }
    
    // Update balance
    const newBalance = currentBalance - BigInt(amount);
    this.usdcBalances.set(accountId, newBalance.toString());
    
    // Call USDC contract to transfer tokens
    const promise = near.promiseBatchCreate(this.usdcTokenContract);
    const transferArgs = JSON.stringify({
      receiver_id: accountId,
      amount: amount,
      memo: "Withdrawal from AI Gaming Club"
    });
    
    near.promiseBatchActionFunctionCall(
      promise,
      "ft_transfer",
      transferArgs,
      BigInt("1"), // Attached deposit for gas
      BigInt("30000000000000") // Gas
    );
    
    // Emit withdrawal event
    this._emitEvent("USDC_WITHDRAWAL", {
      account_id: accountId,
      amount,
      new_balance: newBalance.toString(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return newBalance.toString();
  }

  /**
   * Lock a user's NEAR balance (admin only)
   * @param account_id - The account ID to lock
   */
  @call({})
  lockNearBalance({ account_id }) {
    // Check if caller is admin
    this._assertAdmin();
    
    // Set lock status
    this.nearLocked.set(account_id, "1");
    
    // Emit lock event
    this._emitEvent("NEAR_BALANCE_LOCKED", {
      account_id,
      admin: near.predecessorAccountId(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Unlock a user's NEAR balance and optionally adjust the balance (admin only)
   * @param account_id - The account ID to unlock
   * @param new_balance - The new balance to set (optional)
   */
  @call({})
  unlockNearBalance({ account_id, new_balance = null }) {
    // Check if caller is admin
    this._assertAdmin();
    
    // Check if account is locked
    if (!this._isNearLocked(account_id)) {
      throw new Error("Account is not locked");
    }
    
    // Remove lock status
    this.nearLocked.set(account_id, "0");
    
    // Adjust balance if specified
    if (new_balance !== null) {
      this.nearBalances.set(account_id, new_balance);
    }
    
    // Emit unlock event
    this._emitEvent("NEAR_BALANCE_UNLOCKED", {
      account_id,
      admin: near.predecessorAccountId(),
      new_balance: new_balance !== null ? new_balance : this._getNearBalance(account_id),
      balance_adjusted: new_balance !== null,
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Lock a user's USDC balance (admin only)
   * @param account_id - The account ID to lock
   */
  @call({})
  lockUsdcBalance({ account_id }) {
    // Check if caller is admin
    this._assertAdmin();
    
    // Set lock status
    this.usdcLocked.set(account_id, "1");
    
    // Emit lock event
    this._emitEvent("USDC_BALANCE_LOCKED", {
      account_id,
      admin: near.predecessorAccountId(),
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Unlock a user's USDC balance and optionally adjust the balance (admin only)
   * @param account_id - The account ID to unlock
   * @param new_balance - The new balance to set (optional)
   */
  @call({})
  unlockUsdcBalance({ account_id, new_balance = null }) {
    // Check if caller is admin
    this._assertAdmin();
    
    // Check if account is locked
    if (!this._isUsdcLocked(account_id)) {
      throw new Error("Account is not locked");
    }
    
    // Remove lock status
    this.usdcLocked.set(account_id, "0");
    
    // Adjust balance if specified
    if (new_balance !== null) {
      this.usdcBalances.set(account_id, new_balance);
    }
    
    // Emit unlock event
    this._emitEvent("USDC_BALANCE_UNLOCKED", {
      account_id,
      admin: near.predecessorAccountId(),
      new_balance: new_balance !== null ? new_balance : this._getUsdcBalance(account_id),
      balance_adjusted: new_balance !== null,
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Change the admin account (admin only)
   * @param new_admin - The new admin account ID
   */
  @call({})
  changeAdmin({ new_admin }) {
    // Check if caller is admin
    this._assertAdmin();
    
    const oldAdmin = this.adminAccount;
    this.adminAccount = new_admin;
    
    // Emit admin change event
    this._emitEvent("ADMIN_CHANGED", {
      old_admin: oldAdmin,
      new_admin,
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Emergency method to reset admin - only callable by the contract account itself
   * @param new_admin - The new admin account ID
   */
  @call({})
  emergency_reset_admin({ new_admin }) {
    const caller = near.predecessorAccountId();
    const contractAccount = near.currentAccountId();
    
    // Only the contract account itself can call this method
    if (caller !== contractAccount) {
      throw new Error("Only the contract account can reset the admin");
    }
    
    const oldAdmin = this.adminAccount;
    this.adminAccount = new_admin;
    
    // Emit admin reset event
    this._emitEvent("ADMIN_CHANGED", {
      old_admin: oldAdmin,
      new_admin,
      timestamp: this._getCurrentTimestamp()
    });
    
    return true;
  }

  /**
   * Get the NEAR balance of an account
   * @param account_id - The account ID to check
   * @returns The NEAR balance of the account
   */
  @view({})
  getNearBalance({ account_id }) {
    return this._getNearBalance(account_id);
  }

  /**
   * Get the USDC balance of an account
   * @param account_id - The account ID to check
   * @returns The USDC balance of the account
   */
  @view({})
  getUsdcBalance({ account_id }) {
    return this._getUsdcBalance(account_id);
  }

  /**
   * Check if an account's NEAR balance is locked
   * @param account_id - The account ID to check
   * @returns Whether the account's NEAR balance is locked
   */
  @view({})
  isNearLocked({ account_id }) {
    return this._isNearLocked(account_id);
  }

  /**
   * Check if an account's USDC balance is locked
   * @param account_id - The account ID to check
   * @returns Whether the account's USDC balance is locked
   */
  @view({})
  isUsdcLocked({ account_id }) {
    return this._isUsdcLocked(account_id);
  }

  /**
   * Get the current admin account
   * @returns The admin account ID
   */
  @view({})
  getAdmin() {
    return this.adminAccount;
  }

  /**
   * Internal method to get the NEAR balance of an account
   * @param accountId - The account ID to check
   * @returns The NEAR balance of the account
   */
  _getNearBalance(accountId) {
    const balance = this.nearBalances.get(accountId);
    return balance === null ? "0" : balance;
  }

  /**
   * Internal method to get the USDC balance of an account
   * @param accountId - The account ID to check
   * @returns The USDC balance of the account
   */
  _getUsdcBalance(accountId) {
    const balance = this.usdcBalances.get(accountId);
    return balance === null ? "0" : balance;
  }

  /**
   * Internal method to check if an account's NEAR balance is locked
   * @param accountId - The account ID to check
   * @returns Whether the account's NEAR balance is locked
   */
  _isNearLocked(accountId) {
    return this.nearLocked.get(accountId) === "1";
  }

  /**
   * Internal method to check if an account's USDC balance is locked
   * @param accountId - The account ID to check
   * @returns Whether the account's USDC balance is locked
   */
  _isUsdcLocked(accountId) {
    return this.usdcLocked.get(accountId) === "1";
  }

  /**
   * Internal method to emit an event
   * @param event_type - The type of event
   * @param data - The event data
   */
  _emitEvent(event_type, data) {
    near.log(`EVENT: ${JSON.stringify({
      standard: "ai-gaming-club",
      version: "1.0.0",
      event: event_type,
      data
    })}`);
  }

  /**
   * Internal method to get the current timestamp
   * @returns The current timestamp in nanoseconds
   */
  _getCurrentTimestamp() {
    return near.blockTimestamp().toString();
  }

  /**
   * Internal method to assert that the caller is the admin
   */
  _assertAdmin() {
    const caller = near.predecessorAccountId();
    const contractAccount = near.currentAccountId();
    
    // Allow both the set admin and the contract account itself to have admin privileges
    if (caller !== this.adminAccount && caller !== contractAccount) {
      throw new Error("Only the admin or contract owner can call this method");
    }
  }
}
