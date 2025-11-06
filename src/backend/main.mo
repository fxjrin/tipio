import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";
import Char "mo:base/Char";
import Array "mo:base/Array";
import Order "mo:base/Order";

persistent actor Tipio {

  // ICRC-21 consent message types for wallet integration
  type icrc21_consent_message_metadata = {
    language : Text;
    utc_offset_minutes : ?Int16;
  };

  type icrc21_consent_message_spec = {
    metadata : icrc21_consent_message_metadata;
    device_spec : ?{
      #GenericDisplay;
      #FieldsDisplay;
    };
  };

  type icrc21_consent_message_request = {
    method : Text;
    arg : Blob;
    user_preferences : icrc21_consent_message_spec;
  };

  type icrc21_consent_message = {
    #GenericDisplayMessage : Text;
  };

  type icrc21_consent_info = {
    consent_message : icrc21_consent_message;
    metadata : icrc21_consent_message_metadata;
  };

  type icrc21_error_info = {
    description : Text;
  };

  type icrc21_error = {
    #UnsupportedCanisterCall : icrc21_error_info;
    #ConsentMessageUnavailable : icrc21_error_info;
    #InsufficientPayment : icrc21_error_info;
    #GenericError : { description : Text; error_code : Nat };
  };

  type icrc21_consent_message_response = {
    #Ok : icrc21_consent_info;
    #Err : icrc21_error;
  };

  // User tier system: Free (limited withdrawals) or Premium (unlimited)
  type UserTier = {
    #Free;
    #Premium;
  };

  type UserProfile = {
    username : Text;
    principal : Principal;
    identityPrincipal : Principal;
    walletPrincipal : ?Principal;
    walletType : ?Text;
    tier : UserTier;
    withdrawCount : Nat;
    lastWithdrawReset : Int;
    createdAt : Int;
    avatarBackgroundColor : Text;
    avatarEmoji : Text;
  };

  type TipStatus = {
    #Pending;
    #Received;
    #Withdrawn;
  };

  type Tip = {
    id : Text;
    subaccount : Blob;
    recipient : Principal;
    recipientUsername : Text;
    amount : Nat;
    token : Text;
    tokenCanisterId : Text;
    sender : ?Principal;
    message : ?Text;
    status : TipStatus;
    createdAt : Int;
  };

  type CreateTipRequest = {
    recipientUsername : Text;
    token : Text;
    tokenCanisterId : Text;
    message : ?Text;
    blockIndex : Nat;
    amount : Nat;
  };

  type CreateTipResponse = {
    tipId : Text;
    tip : Tip;
  };

  type PrepareTipResponse = {
    tipId : Text;
    subaccount : Blob;
    canisterPrincipal : Principal;
    recipientPrincipal : Principal;
  };

  type UpgradePayment = {
    principal : Principal;
    subaccount : Blob;
    paid : Bool;
    createdAt : Int;
  };

  type TokenInfo = {
    symbol : Text;
    canisterId : Text;
    decimals : Nat8;
    isWhitelisted : Bool;
    addedAt : Int;
  };

  // Platform configuration
  var ADMIN_PRINCIPAL : Principal = Principal.fromText("bbxim-6nr3r-slb6d-ow72z-r7rca-tjk72-p5dvy-awrvo-6uwbe-briwd-yqe");
  var PLATFORM_FEE_PERCENT : Nat = 2; // 2% fee on withdrawals
  var FREE_PREMIUM_FOR_NEW_USERS : Bool = false;
  var FREE_TIER_DAILY_WITHDRAW_LIMIT : Nat = 3;

  // Stable storage for canister upgrades
  var usernameToProfileEntries : [(Text, UserProfile)] = [];
  var principalToUsernameEntries : [(Principal, Text)] = [];
  var tipsEntries : [(Text, Tip)] = [];
  var tipCounter : Nat = 0;
  var upgradePaymentsEntries : [(Principal, UpgradePayment)] = [];
  var upgradeCounter : Nat = 0;
  var supportedTokensEntries : [(Text, TokenInfo)] = [];

  // Runtime state (rebuilt on upgrade)
  transient var usernameToProfile = HashMap.HashMap<Text, UserProfile>(10, Text.equal, Text.hash);
  transient var principalToUsername = HashMap.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);
  transient var tips = HashMap.HashMap<Text, Tip>(10, Text.equal, Text.hash);
  transient var upgradePayments = HashMap.HashMap<Principal, UpgradePayment>(10, Principal.equal, Principal.hash);
  transient var supportedTokens = HashMap.HashMap<Text, TokenInfo>(10, Text.equal, Text.hash);

  // Initialize default whitelisted tokens (ICP, ckBTC, ckUSDC, ckETH, ckUSDT)
  private func initializeDefaultTokens() {

    supportedTokens.put(
      "ICP",
      {
        symbol = "ICP";
        canisterId = "ryjl3-tyaaa-aaaaa-aaaba-cai";
        decimals = 8;
        isWhitelisted = true;
        addedAt = Time.now();
      },
    );

    supportedTokens.put(
      "ckBTC",
      {
        symbol = "ckBTC";
        canisterId = "mxzaz-hqaaa-aaaar-qaada-cai";
        decimals = 8;
        isWhitelisted = true;
        addedAt = Time.now();
      },
    );

    supportedTokens.put(
      "ckUSDC",
      {
        symbol = "ckUSDC";
        canisterId = "xevnm-gaaaa-aaaar-qafnq-cai";
        decimals = 6;
        isWhitelisted = true;
        addedAt = Time.now();
      },
    );

    supportedTokens.put(
      "ckETH",
      {
        symbol = "ckETH";
        canisterId = "ss2fx-dyaaa-aaaar-qacoq-cai";
        decimals = 18;
        isWhitelisted = true;
        addedAt = Time.now();
      },
    );

    supportedTokens.put(
      "ckUSDT",
      {
        symbol = "ckUSDT";
        canisterId = "cngnf-vqaaa-aaaar-qag4q-cai";
        decimals = 6;
        isWhitelisted = true;
        addedAt = Time.now();
      },
    );
  };

  // Save state before canister upgrade
  system func preupgrade() {
    usernameToProfileEntries := Iter.toArray(usernameToProfile.entries());
    principalToUsernameEntries := Iter.toArray(principalToUsername.entries());
    tipsEntries := Iter.toArray(tips.entries());
    upgradePaymentsEntries := Iter.toArray(upgradePayments.entries());
    supportedTokensEntries := Iter.toArray(supportedTokens.entries());
  };

  // Restore state after canister upgrade
  system func postupgrade() {
    usernameToProfile := HashMap.fromIter<Text, UserProfile>(
      usernameToProfileEntries.vals(),
      10,
      Text.equal,
      Text.hash,
    );
    principalToUsername := HashMap.fromIter<Principal, Text>(
      principalToUsernameEntries.vals(),
      10,
      Principal.equal,
      Principal.hash,
    );
    tips := HashMap.fromIter<Text, Tip>(
      tipsEntries.vals(),
      10,
      Text.equal,
      Text.hash,
    );
    upgradePayments := HashMap.fromIter<Principal, UpgradePayment>(
      upgradePaymentsEntries.vals(),
      10,
      Principal.equal,
      Principal.hash,
    );
    supportedTokens := HashMap.fromIter<Text, TokenInfo>(
      supportedTokensEntries.vals(),
      10,
      Text.equal,
      Text.hash,
    );

    // Initialize default tokens on first deployment
    if (supportedTokens.size() == 0) {
      initializeDefaultTokens();
    };

    usernameToProfileEntries := [];
    principalToUsernameEntries := [];
    tipsEntries := [];
    upgradePaymentsEntries := [];
    supportedTokensEntries := [];
  };

  // Generate unique 32-byte subaccount from numeric ID
  private func generateSubaccount(tipId : Nat) : Blob {
    let bytes = Buffer.Buffer<Nat8>(32);

    var n = tipId;
    var i = 0;
    while (i < 8) {
      let byte = n % 256;
      bytes.add(Nat8.fromIntWrap(byte));
      n := n / 256;
      i += 1;
    };

    while (bytes.size() < 32) {
      bytes.add(Nat8.fromIntWrap(0));
    };

    return Blob.fromArray(Buffer.toArray(bytes));
  };

  // Validate username: 3-20 characters, alphanumeric + underscore only
  private func isValidUsername(username : Text) : Bool {
    let chars = Text.toIter(username);
    var length = 0;

    for (c in chars) {
      length += 1;

      if (not ((c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or (c >= '0' and c <= '9') or c == '_')) {
        return false;
      };
    };

    return length >= 3 and length <= 20;
  };

  // Convert username to lowercase for case-insensitive matching
  private func normalizeUsername(username : Text) : Text {
    Text.map(
      username,
      func(c : Char) : Char {
        if (c >= 'A' and c <= 'Z') {
          let codePoint = Char.toNat32(c);
          let offset = codePoint - Char.toNat32('A');
          let lowerCodePoint = Char.toNat32('a') + offset;
          return Char.fromNat32(lowerCodePoint);
        } else {
          return c;
        };
      },
    );
  };

  public shared (msg) func registerUsername(username : Text) : async Result.Result<UserProfile, Text> {
    let caller = msg.caller;

    let normalizedUsername = normalizeUsername(username);

    if (not isValidUsername(normalizedUsername)) {
      return #err("Invalid username. Use 3-20 alphanumeric characters or underscore only.");
    };

    switch (usernameToProfile.get(normalizedUsername)) {
      case (?_) { return #err("Username already taken") };
      case null {};
    };

    switch (principalToUsername.get(caller)) {
      case (?existingUsername) {
        return #err("You already have a username: " # existingUsername);
      };
      case null {};
    };

    // Assign initial tier based on admin setting
    let initialTier : UserTier = if (FREE_PREMIUM_FOR_NEW_USERS) {
      #Premium;
    } else {
      #Free;
    };

    let profile : UserProfile = {
      username = normalizedUsername;
      principal = caller;
      identityPrincipal = caller;
      walletPrincipal = null;
      walletType = null;
      tier = initialTier;
      withdrawCount = 0;
      lastWithdrawReset = Time.now();
      createdAt = Time.now();
      avatarBackgroundColor = "#f7931a";
      avatarEmoji = "🐱";
    };

    usernameToProfile.put(normalizedUsername, profile);
    principalToUsername.put(caller, normalizedUsername);

    return #ok(profile);
  };

  public query func getUserByUsername(username : Text) : async ?UserProfile {
    let normalizedUsername = normalizeUsername(username);
    return usernameToProfile.get(normalizedUsername);
  };

  public query func getUserByPrincipal(principal : Principal) : async ?UserProfile {
    switch (principalToUsername.get(principal)) {
      case (?username) { return usernameToProfile.get(username) };
      case null { return null };
    };
  };

  public query func isUsernameAvailable(username : Text) : async Bool {
    let normalizedUsername = normalizeUsername(username);
    switch (usernameToProfile.get(normalizedUsername)) {
      case (?_) { return false };
      case null { return true };
    };
  };

  public query func getSupportedTokens() : async [TokenInfo] {
    let buffer = Buffer.Buffer<TokenInfo>(supportedTokens.size());
    for ((_, token) in supportedTokens.entries()) {
      buffer.add(token);
    };
    return Buffer.toArray(buffer);
  };

  public query func getWhitelistedTokens() : async [TokenInfo] {
    let buffer = Buffer.Buffer<TokenInfo>(10);
    for ((_, token) in supportedTokens.entries()) {
      if (token.isWhitelisted) {
        buffer.add(token);
      };
    };
    return Buffer.toArray(buffer);
  };

  public query func getTokenInfo(symbol : Text) : async ?TokenInfo {
    return supportedTokens.get(symbol);
  };

  public query func isTokenSupported(symbol : Text) : async Bool {
    switch (supportedTokens.get(symbol)) {
      case (?_) { return true };
      case null { return false };
    };
  };

  public shared (msg) func addSupportedToken(
    symbol : Text,
    canisterId : Text,
    decimals : Nat8,
    isWhitelisted : Bool,
  ) : async Result.Result<Text, Text> {
    let caller = msg.caller;

    if (caller != ADMIN_PRINCIPAL) {
      return #err("Unauthorized: Only admin can add tokens");
    };

    switch (supportedTokens.get(symbol)) {
      case (?_) {
        return #err("Token already exists");
      };
      case null {};
    };

    let tokenInfo : TokenInfo = {
      symbol = symbol;
      canisterId = canisterId;
      decimals = decimals;
      isWhitelisted = isWhitelisted;
      addedAt = Time.now();
    };

    supportedTokens.put(symbol, tokenInfo);

    return #ok("Token added successfully: " # symbol);
  };

  public shared (msg) func connectWallet(walletPrincipal : Principal, walletType : Text) : async Result.Result<UserProfile, Text> {
    let caller = msg.caller;

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null {
        return #err("User not registered. Please register with Internet Identity first.");
      };
    };

    let profile = switch (usernameToProfile.get(username)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    if (walletType != "oisy" and walletType != "plug") {
      return #err("Invalid wallet type. Must be 'oisy' or 'plug'.");
    };

    let updatedProfile : UserProfile = {
      username = profile.username;
      principal = profile.principal;
      identityPrincipal = profile.identityPrincipal;
      walletPrincipal = ?walletPrincipal;
      walletType = ?walletType;
      tier = profile.tier;
      withdrawCount = profile.withdrawCount;
      lastWithdrawReset = profile.lastWithdrawReset;
      createdAt = profile.createdAt;
      avatarBackgroundColor = profile.avatarBackgroundColor;
      avatarEmoji = profile.avatarEmoji;
    };

    usernameToProfile.put(username, updatedProfile);

    return #ok(updatedProfile);
  };

  public shared (msg) func disconnectWallet() : async Result.Result<UserProfile, Text> {
    let caller = msg.caller;

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return #err("User not registered") };
    };

    let profile = switch (usernameToProfile.get(username)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    let updatedProfile : UserProfile = {
      username = profile.username;
      principal = profile.principal;
      identityPrincipal = profile.identityPrincipal;
      walletPrincipal = null;
      walletType = null;
      tier = profile.tier;
      withdrawCount = profile.withdrawCount;
      lastWithdrawReset = profile.lastWithdrawReset;
      createdAt = profile.createdAt;
      avatarBackgroundColor = profile.avatarBackgroundColor;
      avatarEmoji = profile.avatarEmoji;
    };

    usernameToProfile.put(username, updatedProfile);

    return #ok(updatedProfile);
  };

  public shared (msg) func updateAvatar(backgroundColor : Text, emoji : Text) : async Result.Result<UserProfile, Text> {
    let caller = msg.caller;

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return #err("User not registered") };
    };

    let profile = switch (usernameToProfile.get(username)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    if (Text.size(backgroundColor) < 4 or Text.size(backgroundColor) > 7) {
      return #err("Invalid color format. Use hex format like #f7931a");
    };

    if (Text.size(emoji) == 0) {
      return #err("Emoji cannot be empty");
    };

    let updatedProfile : UserProfile = {
      username = profile.username;
      principal = profile.principal;
      identityPrincipal = profile.identityPrincipal;
      walletPrincipal = profile.walletPrincipal;
      walletType = profile.walletType;
      tier = profile.tier;
      withdrawCount = profile.withdrawCount;
      lastWithdrawReset = profile.lastWithdrawReset;
      createdAt = profile.createdAt;
      avatarBackgroundColor = backgroundColor;
      avatarEmoji = emoji;
    };

    usernameToProfile.put(username, updatedProfile);

    return #ok(updatedProfile);
  };

  public shared (msg) func changeUsername(newUsername : Text) : async Result.Result<UserProfile, Text> {
    let caller = msg.caller;

    let oldUsername = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return #err("User not registered") };
    };

    let normalizedNewUsername = normalizeUsername(newUsername);

    if (oldUsername == normalizedNewUsername) {
      return #err("New username is the same as current username");
    };

    if (not isValidUsername(normalizedNewUsername)) {
      return #err("Invalid username. Use 3-20 alphanumeric characters or underscore only.");
    };

    switch (usernameToProfile.get(normalizedNewUsername)) {
      case (?_) { return #err("Username already taken") };
      case null {};
    };

    let profile = switch (usernameToProfile.get(oldUsername)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    let updatedProfile : UserProfile = {
      username = normalizedNewUsername;
      principal = profile.principal;
      identityPrincipal = profile.identityPrincipal;
      walletPrincipal = profile.walletPrincipal;
      walletType = profile.walletType;
      tier = profile.tier;
      withdrawCount = profile.withdrawCount;
      lastWithdrawReset = profile.lastWithdrawReset;
      createdAt = profile.createdAt;
      avatarBackgroundColor = profile.avatarBackgroundColor;
      avatarEmoji = profile.avatarEmoji;
    };

    let tipsBuffer = Buffer.Buffer<(Text, Tip)>(10);
    for ((tipId, tip) in tips.entries()) {
      if (tip.recipientUsername == oldUsername) {

        let updatedTip : Tip = {
          id = tip.id;
          subaccount = tip.subaccount;
          recipient = tip.recipient;
          recipientUsername = normalizedNewUsername;
          amount = tip.amount;
          token = tip.token;
          tokenCanisterId = tip.tokenCanisterId;
          sender = tip.sender;
          message = tip.message;
          status = tip.status;
          createdAt = tip.createdAt;
        };
        tipsBuffer.add((tipId, updatedTip));
      };
    };

    for ((tipId, updatedTip) in tipsBuffer.vals()) {
      tips.put(tipId, updatedTip);
    };

    usernameToProfile.delete(oldUsername);

    usernameToProfile.put(normalizedNewUsername, updatedProfile);

    principalToUsername.put(caller, normalizedNewUsername);

    return #ok(updatedProfile);
  };

  // Generate tip subaccount and return payment details (no authentication needed)
  public query func prepareTip(recipientUsername : Text) : async Result.Result<PrepareTipResponse, Text> {

    let normalizedRecipientUsername = normalizeUsername(recipientUsername);
    let recipientProfile = switch (usernameToProfile.get(normalizedRecipientUsername)) {
      case (?profile) { profile };
      case null { return #err("Recipient username not found") };
    };

    let nextTipId = Nat.toText(tipCounter + 1);
    let subaccount = generateSubaccount(tipCounter + 1);

    return #ok({
      tipId = nextTipId;
      subaccount = subaccount;
      canisterPrincipal = Principal.fromActor(Tipio);
      recipientPrincipal = recipientProfile.principal;
    });
  };

  // Verify payment and create tip record
  public shared (msg) func createTip(request : CreateTipRequest) : async Result.Result<CreateTipResponse, Text> {

    let normalizedRecipientUsername = normalizeUsername(request.recipientUsername);
    let recipientProfile = switch (usernameToProfile.get(normalizedRecipientUsername)) {
      case (?profile) { profile };
      case null { return #err("Recipient username not found") };
    };

    tipCounter += 1;
    let tipId = Nat.toText(tipCounter);
    let subaccount = generateSubaccount(tipCounter);

    let ledger : ICRC1Ledger = actor (request.tokenCanisterId);

    // Verify funds were actually sent to the subaccount
    let balance = await ledger.icrc1_balance_of({
      owner = Principal.fromActor(Tipio);
      subaccount = ?subaccount;
    });

    if (balance < request.amount) {

      tipCounter -= 1;
      return #err("Transfer verification failed. Balance in subaccount (" # Nat.toText(balance) # ") is less than claimed amount (" # Nat.toText(request.amount) # ")");
    };

    let tip : Tip = {
      id = tipId;
      subaccount = subaccount;
      recipient = recipientProfile.principal;
      recipientUsername = request.recipientUsername;
      amount = balance;
      token = request.token;
      tokenCanisterId = request.tokenCanisterId;
      sender = ?msg.caller;
      message = request.message;
      status = #Received;
      createdAt = Time.now();
    };

    tips.put(tipId, tip);

    return #ok({
      tipId = tipId;
      tip = tip;
    });
  };

  public query func getTip(tipId : Text) : async ?Tip {
    return tips.get(tipId);
  };

  // Calculate ledger fee + platform fee (2%) + extra ledger fee if platform transfer needed
  public func calculateWithdrawalFees(balance : Nat, tokenCanisterId : Text) : async {
    ledgerFee : Nat;
    platformFee : Nat;
    totalFees : Nat;
    amountToReceive : Nat;
  } {

    let ledger : ICRC1Ledger = actor (tokenCanisterId);

    let ledgerFee : Nat = await ledger.icrc1_fee();

    let platformFeeAmount : Nat = (balance * PLATFORM_FEE_PERCENT) / 100;

    // If platform fee > ledger fee, we need a separate transfer (costs extra ledger fee)
    let needsPlatformTransfer = platformFeeAmount > ledgerFee;
    let totalFees = if (needsPlatformTransfer) {
      ledgerFee + platformFeeAmount + ledgerFee;
    } else {
      ledgerFee + platformFeeAmount;
    };

    let amountToReceive = if (balance > totalFees) {
      balance - totalFees;
    } else {
      0;
    };

    return {
      ledgerFee = ledgerFee;
      platformFee = platformFeeAmount;
      totalFees = totalFees;
      amountToReceive = amountToReceive;
    };
  };

  public query func listTipsForUser(username : Text) : async [Tip] {
    let normalizedUsername = normalizeUsername(username);
    let buffer = Buffer.Buffer<Tip>(10);

    for ((_, tip) in tips.entries()) {
      if (tip.recipientUsername == normalizedUsername) {
        buffer.add(tip);
      };
    };

    return Buffer.toArray(buffer);
  };

  // ICRC-21: Provide consent messages for wallet integration
  public query func icrc21_canister_call_consent_message(request : icrc21_consent_message_request) : async icrc21_consent_message_response {
    let methodName = request.method;
    let language = request.user_preferences.metadata.language;

    let consentMessage = switch (methodName) {
      case ("registerUsername") {
        #GenericDisplayMessage("Register your username on Tipio. This will associate your principal with a unique username.");
      };
      case ("createTip") {
        #GenericDisplayMessage("Create a new tip. This will generate a unique subaccount for receiving the tip.");
      };
      case ("withdrawTip") {
        #GenericDisplayMessage("Withdraw your tip funds. This will transfer the tokens from the tip's subaccount to your wallet.");
      };
      case (_) {
        #GenericDisplayMessage("Execute " # methodName # " on Tipio");
      };
    };

    return #Ok({
      consent_message = consentMessage;
      metadata = {
        language = language;
        utc_offset_minutes = request.user_preferences.metadata.utc_offset_minutes;
      };
    });
  };

  // ICRC-10: Declare supported standards
  public query func icrc10_supported_standards() : async [{
    name : Text;
    url : Text;
  }] {
    return [{
      name = "ICRC-21";
      url = "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-21/ICRC-21.md";
    }];
  };

  // ICRC-1 types for token transfers
  type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  type TransferArgs = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type ICRC1Ledger = actor {
    icrc1_balance_of : (Account) -> async Nat;
    icrc1_transfer : (TransferArgs) -> async TransferResult;
    icrc1_fee : () -> async Nat;
  };

  let ICP_LEDGER : ICRC1Ledger = actor "ryjl3-tyaaa-aaaaa-aaaba-cai";

  // Check and enforce daily withdrawal limit for Free tier users
  private func checkAndUpdateWithdrawLimit(profile : UserProfile) : Result.Result<UserProfile, Text> {

    switch (profile.tier) {
      case (#Premium) { return #ok(profile) };
      case (#Free) {

        let now = Time.now();
        let dayInNanos : Int = 86400000000000;

        // Reset counter if 24 hours have passed
        if (now - profile.lastWithdrawReset >= dayInNanos) {

          let resetProfile : UserProfile = {
            username = profile.username;
            principal = profile.principal;
            identityPrincipal = profile.identityPrincipal;
            walletPrincipal = profile.walletPrincipal;
            walletType = profile.walletType;
            tier = profile.tier;
            withdrawCount = 0;
            lastWithdrawReset = now;
            createdAt = profile.createdAt;
            avatarBackgroundColor = profile.avatarBackgroundColor;
            avatarEmoji = profile.avatarEmoji;
          };
          return #ok(resetProfile);
        };

        if (profile.withdrawCount >= FREE_TIER_DAILY_WITHDRAW_LIMIT) {
          return #err("Daily withdraw limit reached. Upgrade to Premium for unlimited withdrawals.");
        };

        let updatedProfile : UserProfile = {
          username = profile.username;
          principal = profile.principal;
          identityPrincipal = profile.identityPrincipal;
          walletPrincipal = profile.walletPrincipal;
          walletType = profile.walletType;
          tier = profile.tier;
          withdrawCount = profile.withdrawCount + 1;
          lastWithdrawReset = profile.lastWithdrawReset;
          createdAt = profile.createdAt;
          avatarBackgroundColor = profile.avatarBackgroundColor;
          avatarEmoji = profile.avatarEmoji;
        };
        return #ok(updatedProfile);
      };
    };
  };

  // Withdraw tip funds: send to user's wallet, deduct fees, send platform fee to admin
  public shared (msg) func withdrawTip(tipId : Text) : async Result.Result<Nat, Text> {
    let caller = msg.caller;

    let tip = switch (tips.get(tipId)) {
      case (?t) { t };
      case null { return #err("Tip not found") };
    };

    let recipientProfile = switch (principalToUsername.get(tip.recipient)) {
      case (?username) {
        switch (usernameToProfile.get(username)) {
          case (?profile) { profile };
          case null { return #err("Recipient profile not found") };
        };
      };
      case null { return #err("Recipient not registered") };
    };

    // Allow withdrawal by either Internet Identity or connected wallet
    let isIdentity = Principal.equal(caller, tip.recipient);
    let isWallet = switch (recipientProfile.walletPrincipal) {
      case (?walletP) { Principal.equal(caller, walletP) };
      case null { false };
    };

    if (not (isIdentity or isWallet)) {
      return #err("Only the recipient can withdraw this tip");
    };

    let userProfile = recipientProfile;

    let updatedProfile = switch (checkAndUpdateWithdrawLimit(userProfile)) {
      case (#ok(profile)) { profile };
      case (#err(msg)) { return #err(msg) };
    };

    usernameToProfile.put(updatedProfile.username, updatedProfile);

    switch (tip.status) {
      case (#Withdrawn) { return #err("Tip already withdrawn") };
      case _ {};
    };

    let ledger : ICRC1Ledger = actor (tip.tokenCanisterId);

    let balance = await ledger.icrc1_balance_of({
      owner = Principal.fromActor(Tipio);
      subaccount = ?tip.subaccount;
    });

    if (balance == 0) {
      return #err("No funds in this tip");
    };

    let ledgerFee : Nat = await ledger.icrc1_fee();

    let platformFeeAmount : Nat = (balance * PLATFORM_FEE_PERCENT) / 100;

    let needsPlatformTransfer = platformFeeAmount > ledgerFee;
    let totalFees = if (needsPlatformTransfer) {
      ledgerFee + platformFeeAmount + ledgerFee;
    } else {
      ledgerFee + platformFeeAmount;
    };

    if (balance <= totalFees) {
      return #err("Insufficient balance to cover fees. Balance: " # Nat.toText(balance) # ", Required fees: " # Nat.toText(totalFees));
    };

    let amountToUser = balance - totalFees;

    let recipientPrincipal = switch (userProfile.walletPrincipal) {
      case (?walletP) { walletP };
      case null {
        return #err("Please connect a wallet before withdrawing");
      };
    };

    let transferResult = await ledger.icrc1_transfer({
      from_subaccount = ?tip.subaccount;
      to = {
        owner = recipientPrincipal;
        subaccount = null;
      };
      amount = amountToUser;
      fee = ?ledgerFee;
      memo = null;
      created_at_time = null;
    });

    switch (transferResult) {
      case (#Ok(blockIndex)) {

        // Send platform fee to admin if significant enough
        if (platformFeeAmount > ledgerFee) {
          let feeTransferResult = await ledger.icrc1_transfer({
            from_subaccount = ?tip.subaccount;
            to = {
              owner = ADMIN_PRINCIPAL;
              subaccount = null;
            };
            amount = platformFeeAmount;
            fee = ?ledgerFee;
            memo = null;
            created_at_time = null;
          });

          switch (feeTransferResult) {
            case (#Ok(_)) { /* Platform fee transferred successfully */ };
            case (#Err(_)) { /* Log error but continue */ };
          };
        };

        let updatedTip : Tip = {
          id = tip.id;
          subaccount = tip.subaccount;
          recipient = tip.recipient;
          recipientUsername = tip.recipientUsername;
          amount = balance;
          token = tip.token;
          tokenCanisterId = tip.tokenCanisterId;
          sender = tip.sender;
          message = tip.message;
          status = #Withdrawn;
          createdAt = tip.createdAt;
        };
        tips.put(tipId, updatedTip);

        return #ok(blockIndex);
      };
      case (#Err(error)) {
        let errorMsg = switch (error) {
          case (#InsufficientFunds({ balance })) {
            "Insufficient funds: " # Nat.toText(balance);
          };
          case (#BadFee({ expected_fee })) {
            "Bad fee. Expected: " # Nat.toText(expected_fee);
          };
          case (#GenericError({ message })) { message };
          case (#TemporarilyUnavailable) { "Ledger temporarily unavailable" };
          case _ { "Transfer failed" };
        };
        return #err(errorMsg);
      };
    };
  };

  public query func getTipBalance(tipId : Text) : async Result.Result<Nat, Text> {
    let tip = switch (tips.get(tipId)) {
      case (?t) { t };
      case null { return #err("Tip not found") };
    };

    return #ok(tip.amount);
  };

  // Check tip balance on-chain and update if funds received
  public func checkTipBalance(tipId : Text) : async Result.Result<Nat, Text> {
    let tip = switch (tips.get(tipId)) {
      case (?t) { t };
      case null { return #err("Tip not found") };
    };

    let ledger : ICRC1Ledger = actor (tip.tokenCanisterId);

    let balance = await ledger.icrc1_balance_of({
      owner = Principal.fromActor(Tipio);
      subaccount = ?tip.subaccount;
    });

    if (balance > 0 and tip.amount == 0) {
      let updatedTip : Tip = {
        id = tip.id;
        subaccount = tip.subaccount;
        recipient = tip.recipient;
        recipientUsername = tip.recipientUsername;
        amount = balance;
        token = tip.token;
        tokenCanisterId = tip.tokenCanisterId;
        sender = tip.sender;
        message = tip.message;
        status = #Received;
        createdAt = tip.createdAt;
      };
      tips.put(tipId, updatedTip);
    };

    return #ok(balance);
  };

  // Get all tips for authenticated user (sorted by newest first)
  public shared (msg) func getAllTipBalancesForUser() : async [(Text, Nat)] {
    let caller = msg.caller;

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return [] };
    };

    let normalizedUsername = normalizeUsername(username);
    let buffer = Buffer.Buffer<(Text, Nat)>(10);

    let userTips = Buffer.Buffer<(Text, Tip)>(10);
    for ((tipId, tip) in tips.entries()) {
      if (tip.recipientUsername == normalizedUsername) {
        userTips.add((tipId, tip));
      };
    };

    let sortedTips = Array.sort<(Text, Tip)>(
      Buffer.toArray(userTips),
      func(a : (Text, Tip), b : (Text, Tip)) : Order.Order {
        let (_, tipA) = a;
        let (_, tipB) = b;
        if (tipA.createdAt > tipB.createdAt) { #less } else if (tipA.createdAt < tipB.createdAt) {
          #greater;
        } else { #equal };
      },
    );

    for ((tipId, tip) in sortedTips.vals()) {
      buffer.add((tipId, tip.amount));
    };

    return Buffer.toArray(buffer);
  };

  // Batch refresh balances for user's tips (limited to N most recent non-withdrawn)
  public func refreshTipBalancesForUser(username : Text, limit : Nat) : async [(Text, Nat)] {
    let normalizedUsername = normalizeUsername(username);
    let buffer = Buffer.Buffer<(Text, Nat)>(10);

    let userTips = Buffer.Buffer<(Text, Tip)>(10);
    for ((tipId, tip) in tips.entries()) {
      if (tip.recipientUsername == normalizedUsername and not (switch (tip.status) { case (#Withdrawn) true; case _ false })) {
        userTips.add((tipId, tip));
      };
    };

    let sortedTips = Array.sort<(Text, Tip)>(
      Buffer.toArray(userTips),
      func(a : (Text, Tip), b : (Text, Tip)) : Order.Order {
        let (_, tipA) = a;
        let (_, tipB) = b;
        if (tipA.createdAt > tipB.createdAt) { #less } else if (tipA.createdAt < tipB.createdAt) {
          #greater;
        } else { #equal };
      },
    );

    let tipsToCheck = if (sortedTips.size() > limit) {
      Array.tabulate<(Text, Tip)>(limit, func(i) { sortedTips[i] });
    } else {
      sortedTips;
    };

    for ((tipId, tip) in tipsToCheck.vals()) {
      try {
        let ledger : ICRC1Ledger = actor (tip.tokenCanisterId);
        let balance = await ledger.icrc1_balance_of({
          owner = Principal.fromActor(Tipio);
          subaccount = ?tip.subaccount;
        });

        if (balance > 0 and tip.amount == 0) {
          let updatedTip : Tip = {
            id = tip.id;
            subaccount = tip.subaccount;
            recipient = tip.recipient;
            recipientUsername = tip.recipientUsername;
            amount = balance;
            token = tip.token;
            tokenCanisterId = tip.tokenCanisterId;
            sender = tip.sender;
            message = tip.message;
            status = #Received;
            createdAt = tip.createdAt;
          };
          tips.put(tipId, updatedTip);
        };

        buffer.add((tipId, balance));
      } catch (_) {
        buffer.add((tipId, 0));
      };
    };

    return Buffer.toArray(buffer);
  };

  // Request Premium upgrade: generate payment subaccount (1 ICP)
  public shared (msg) func requestUpgrade() : async Result.Result<{ subaccount : Blob; canisterPrincipal : Principal }, Text> {
    let caller = msg.caller;

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return #err("User not registered") };
    };

    let profile = switch (usernameToProfile.get(username)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    switch (profile.tier) {
      case (#Premium) { return #err("You are already a Premium user") };
      case (#Free) {};
    };

    // Check if user already has pending payment
    switch (upgradePayments.get(caller)) {
      case (?existing) {
        if (not existing.paid) {

          let icpLedger = ICP_LEDGER;
          let balance = await icpLedger.icrc1_balance_of({
            owner = Principal.fromActor(Tipio);
            subaccount = ?existing.subaccount;
          });

          let requiredAmount : Nat = 100000000; // 1 ICP

          if (balance >= requiredAmount) {

            ignore await completeUpgradeInternal(caller);

            return #err("Upgrade completed successfully! Please refresh the page.");
          } else {

            return #ok({
              subaccount = existing.subaccount;
              canisterPrincipal = Principal.fromActor(Tipio);
            });
          };
        };
      };
      case null {};
    };

    upgradeCounter += 1;
    let subaccount = generateSubaccount(1000000 + upgradeCounter);

    let payment : UpgradePayment = {
      principal = caller;
      subaccount = subaccount;
      paid = false;
      createdAt = Time.now();
    };
    upgradePayments.put(caller, payment);

    return #ok({
      subaccount = subaccount;
      canisterPrincipal = Principal.fromActor(Tipio);
    });
  };

  // Verify payment and upgrade user to Premium tier
  private func completeUpgradeInternal(caller : Principal) : async Result.Result<Text, Text> {

    let username = switch (principalToUsername.get(caller)) {
      case (?u) { u };
      case null { return #err("User not registered") };
    };

    let profile = switch (usernameToProfile.get(username)) {
      case (?p) { p };
      case null { return #err("Profile not found") };
    };

    switch (profile.tier) {
      case (#Premium) { return #err("You are already a Premium user") };
      case (#Free) {};
    };

    let payment = switch (upgradePayments.get(caller)) {
      case (?p) { p };
      case null {
        return #err("No upgrade payment initiated. Please call requestUpgrade first.");
      };
    };

    if (payment.paid) {
      return #err("Already upgraded to Premium");
    };

    let icpLedger = ICP_LEDGER;
    let balance = await icpLedger.icrc1_balance_of({
      owner = Principal.fromActor(Tipio);
      subaccount = ?payment.subaccount;
    });

    let requiredAmount : Nat = 100000000;

    if (balance < requiredAmount) {
      return #err("Payment not received. Please send 1 ICP to complete the upgrade. Current balance: " # Nat.toText(balance) # " e8s");
    };

    let updatedPayment : UpgradePayment = {
      principal = payment.principal;
      subaccount = payment.subaccount;
      paid = true;
      createdAt = payment.createdAt;
    };
    upgradePayments.put(caller, updatedPayment);

    let ledgerFee : Nat = 10000;

    // Transfer ICP payment to admin
    if (balance > ledgerFee) {
      let amountToAdmin = balance - ledgerFee;
      let transferResult = await icpLedger.icrc1_transfer({
        from_subaccount = ?payment.subaccount;
        to = {
          owner = ADMIN_PRINCIPAL;
          subaccount = null;
        };
        amount = amountToAdmin;
        fee = ?ledgerFee;
        memo = null;
        created_at_time = null;
      });

      switch (transferResult) {
        case (#Ok(_)) { /* Transfer successful */ };
        case (#Err(_)) { /* Log error but continue with upgrade */ };
      };
    };

    let upgradedProfile : UserProfile = {
      username = profile.username;
      principal = profile.principal;
      identityPrincipal = profile.identityPrincipal;
      walletPrincipal = profile.walletPrincipal;
      walletType = profile.walletType;
      tier = #Premium;
      withdrawCount = 0;
      lastWithdrawReset = profile.lastWithdrawReset;
      createdAt = profile.createdAt;
      avatarBackgroundColor = profile.avatarBackgroundColor;
      avatarEmoji = profile.avatarEmoji;
    };

    usernameToProfile.put(username, upgradedProfile);

    return #ok("Successfully upgraded to Premium! Enjoy unlimited withdrawals and advanced features.");
  };

  public shared (msg) func completeUpgrade() : async Result.Result<Text, Text> {
    return await completeUpgradeInternal(msg.caller);
  };

  // Admin functions (only callable by ADMIN_PRINCIPAL)
  public shared (msg) func setAdminPrincipal(newAdmin : Principal) : async Result.Result<Text, Text> {
    if (not Principal.equal(msg.caller, ADMIN_PRINCIPAL)) {
      return #err("Only admin can change admin principal");
    };
    ADMIN_PRINCIPAL := newAdmin;
    return #ok("Admin principal updated");
  };

  public shared (msg) func toggleFreePremiumForNewUsers(enabled : Bool) : async Result.Result<Text, Text> {
    if (not Principal.equal(msg.caller, ADMIN_PRINCIPAL)) {
      return #err("Only admin can toggle this setting");
    };
    FREE_PREMIUM_FOR_NEW_USERS := enabled;
    let status = if (enabled) { "enabled" } else { "disabled" };
    return #ok("Free premium for new users " # status);
  };

  public shared (msg) func setPlatformFeePercent(newFee : Nat) : async Result.Result<Text, Text> {
    if (not Principal.equal(msg.caller, ADMIN_PRINCIPAL)) {
      return #err("Only admin can change platform fee");
    };
    if (newFee > 10) {
      return #err("Fee cannot exceed 10%");
    };
    PLATFORM_FEE_PERCENT := newFee;
    return #ok("Platform fee updated to " # Nat.toText(newFee) # "%");
  };

  public query func getAdminConfig() : async {
    adminPrincipal : Principal;
    platformFeePercent : Nat;
    freePremiumEnabled : Bool;
    dailyWithdrawLimit : Nat;
  } {
    return {
      adminPrincipal = ADMIN_PRINCIPAL;
      platformFeePercent = PLATFORM_FEE_PERCENT;
      freePremiumEnabled = FREE_PREMIUM_FOR_NEW_USERS;
      dailyWithdrawLimit = FREE_TIER_DAILY_WITHDRAW_LIMIT;
    };
  };
};
