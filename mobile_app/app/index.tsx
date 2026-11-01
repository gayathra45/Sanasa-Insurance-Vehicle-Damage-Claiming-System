import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function Index() {
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.35,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1.25,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Subtitle and loader fade-in
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous subtle breathing on glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.35,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Check session and navigate smoothly after minimum splash duration
    const timer = setTimeout(async () => {
      try {
        const userStr = await AsyncStorage.getItem("logged_in_user");
        const agentStr = await AsyncStorage.getItem("logged_in_agent");

        if (userStr) {
          router.replace("/PolicyHolder/page");
          return;
        }
        if (agentStr) {
          router.replace("/Agent/Dashboard/page");
          return;
        }
        router.replace("/login/page");
      } catch {
        router.replace("/login/page");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, glowOpacity, glowScale, contentOpacity, contentTranslateY]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#040E18", "#081E2F", "#0B2B42"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Radiant Background Glow Circle */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Main Brand Container */}
      <View style={styles.centerContent}>
        {/* Animated Sanasa Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Tagline & Loading indicator */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.taglineBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.taglineText}>SClaim Go • Mobile Portal</Text>
          </View>

          <Text style={styles.brandTitle}>SANASA GENERAL INSURANCE</Text>
          <Text style={styles.brandSubtitle}>
            Trusted Protection • Faster Claims
          </Text>

          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#00DDFF" />
            <Text style={styles.loadingText}>Initializing secure session...</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Footer Details */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SANASA Life & General Insurance PLC
        </Text>
        <Text style={styles.versionText}>v1.0.0 • 24/7 Hotline +94 112 003 000</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071624",
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: "#0077B6",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoContainer: {
    width: width * 0.68,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#00DDFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  taglineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 221, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 221, 255, 0.3)",
    marginBottom: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00DDFF",
    marginRight: 6,
  },
  taglineText: {
    color: "#00DDFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  brandSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    position: "absolute",
    bottom: 34,
    alignItems: "center",
  },
  footerText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  versionText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },
});
