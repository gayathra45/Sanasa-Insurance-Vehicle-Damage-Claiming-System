import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

export default function Index() {
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(6)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Smooth entrance animation (0.92 -> 1.0 with subtle fade-in)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Continuous subtle, gentle breathing motion (1.0 -> 1.03)
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.03,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Check session and navigate smoothly after splash duration
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
    }, 2200);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, textOpacity, textTranslateY, breatheAnim]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#051422", "#0A1E2E", "#0D263D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Main Minimalist Centerpiece */}
      <View style={styles.centerContainer}>
        {/* Animated Sanasa Emblem */}
        <Animated.View
          style={[
            styles.emblemContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: Animated.multiply(logoScale, breatheAnim) }],
            },
          ]}
        >
          <Image
            source={require("../assets/images/logo icon.png")}
            style={styles.emblemImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Minimalist Understated Brand Typography */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>SANASA INSURANCE</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1E2E",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emblemContainer: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  emblemImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 4.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
