const fs = require('fs');
const path = require('path');

const mobileFilePath = path.join(__dirname, '..', 'mobile_app', 'app', 'driver-access', '[token].tsx');
let mobileCode = fs.readFileSync(mobileFilePath, 'utf8');

// Normalize line endings for replacement
const isCRLF = mobileCode.includes('\r\n');

// 1. Ensure ImageBackground is imported
if (!mobileCode.includes('ImageBackground')) {
  mobileCode = mobileCode.replace(/Image,\r?\n/, 'Image,\n  ImageBackground,\n');
  console.log('Added ImageBackground to mobile imports');
}

// 2. Locate header
const startSearch = '<LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.headerGradient}>';
const endSearch = '</LinearGradient>';

const startIdx = mobileCode.indexOf(startSearch);
const endIdx = mobileCode.indexOf(endSearch, startIdx);

console.log('startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  // Find preceding comment if any
  const commentToken = '{/* ========================================================================= */}';
  let cutStart = mobileCode.lastIndexOf(commentToken, startIdx);
  if (cutStart === -1) cutStart = startIdx;
  const cutEnd = endIdx + endSearch.length;

  const newHeaderBlock = `{/* ========================================================================= */}
      {/* TAB-SPECIFIC HEADERS (Matching Policyholder Mobile Screens) */}
      {/* ========================================================================= */}
      
      {/* DASHBOARD TAB: Greeting & Stat Summary Cards */}
      {activeTab === "dashboard" && (
        <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.headerGradient}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeLabel}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{profile?.driverName} 👋</Text>
            </View>

            <View style={styles.headerRightActions}>
              <View style={styles.badgeBranch}>
                <Ionicons name="business-outline" size={12} color="#38bdf8" />
                <Text style={styles.badgeBranchText}>{profile?.branch || "Galle"}</Text>
              </View>

              <TouchableOpacity style={styles.avatarButton} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarText}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subtitleBanner}>
            <View style={styles.dotIndicator} />
            <Text style={styles.subtitleText} numberOfLines={2}>
              Authorized by {profile?.policyHolderName} • All vehicles active
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{claims.length}</Text>
              <Text style={styles.statLabel}>Total Claims</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={[styles.statNumber, { color: "#38bdf8" }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#4ade80" }]}>{approvedCount}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* VEHICLES TAB: Policyholder MyVehicles Signature Header */}
      {activeTab === "vehicles" && (
        <ImageBackground
          source={require("../../assets/images/policy1.jpg")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
        >
          <LinearGradient
            colors={["rgba(15, 23, 42, 0.95)", "rgba(15, 23, 42, 0.82)", "rgba(15, 23, 42, 0.5)"]}
            style={styles.headerGradientInner}
          >
            <View style={styles.mobileTabHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileTabHeaderTitle}>My Vehicles</Text>
                <Text style={styles.mobileTabHeaderSubtitle}>
                  Authorized vehicles under policyholder {profile?.policyHolderName || "Policy Holder"}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      )}

      {/* CLAIMS TAB: Policyholder My_claims Signature Header */}
      {activeTab === "claims" && (
        <ImageBackground
          source={require("../../assets/images/myclaim.png")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
        >
          <LinearGradient
            colors={["rgba(13, 42, 58, 0.95)", "rgba(13, 42, 58, 0.82)", "rgba(15, 23, 42, 0.5)"]}
            style={styles.headerGradientInner}
          >
            <View style={styles.mobileTabHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileTabHeaderTitle}>My Claims</Text>
                <Text style={styles.mobileTabHeaderSubtitle}>
                  All authorized driver insurance claims in one place
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      )}

      {/* NEW CLAIM TAB: Policyholder New_Claim Signature Header */}
      {activeTab === "submit" && (
        <LinearGradient
          colors={["#0f172a", "#1e293b"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>File New Claim</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Report an accident or damage incident for authorized vehicles
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* LIVE CHAT TAB: Communication Header */}
      {activeTab === "chat" && (
        <LinearGradient
          colors={["#0f172a", "#1e293b"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>Claim Support Chat</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Direct live chat with assigned adjuster & branch staff
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* DIGITAL PASS TAB: Digital Pass Signature Header */}
      {activeTab === "pass" && (
        <LinearGradient
          colors={["#0c4a6e", "#075985", "#0369a1"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>Digital Driver Pass</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Official credentials verified by Sanasa General Insurance
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}`;

  mobileCode = mobileCode.slice(0, cutStart) + newHeaderBlock + mobileCode.slice(cutEnd);
  console.log('Successfully replaced mobile header!');
}

// 3. Add styles
if (!mobileCode.includes('headerBackground:')) {
  const lastBracketIdx = mobileCode.lastIndexOf('});');
  const additionalStyles = `  headerBackground: {
    width: "100%",
    minHeight: 125,
    backgroundColor: "#0F172A",
    overflow: "hidden"
  },
  headerImageStyle: {
    resizeMode: "cover",
    opacity: 0.35
  },
  headerGradientInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 110,
    justifyContent: "center"
  },
  mobileTabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  mobileTabHeaderTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -0.5
  },
  mobileTabHeaderSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3
  },
  avatarButtonSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#38bdf8"
  },
  avatarTextSmall: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold"
  }
};\n`;
  mobileCode = mobileCode.slice(0, lastBracketIdx) + additionalStyles + ');\n';
  console.log('Added tab header styles to mobile file');
}

fs.writeFileSync(mobileFilePath, mobileCode, 'utf8');
console.log('Saved mobile driver portal [token].tsx successfully!');
