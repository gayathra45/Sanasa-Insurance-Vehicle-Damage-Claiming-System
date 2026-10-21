import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "../_config";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AIChatBotProps {
  userRole?: "policy_holder" | "agent";
  bottomOffset?: number;
}

const QUICK_PROMPTS = [
  {
    label: "📋 What are my claims?",
    text: "What are my registered claims?",
    bgColor: "#f0f9ff",
    borderColor: "#bae6fd",
    textColor: "#0369a1",
  },
  {
    label: "🚗 My Vehicles",
    text: "What are my registered vehicles?",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    textColor: "#047857",
  },
  {
    label: "👤 My Profile",
    text: "What are my registered profile details?",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    textColor: "#6d28d9",
  },
  {
    label: "🚗 File Accident Claim",
    text: "How do I file a vehicle accident claim step-by-step?",
    bgColor: "#fff1f2",
    borderColor: "#fecdd3",
    textColor: "#be123c",
  },
  {
    label: "🛡️ Comprehensive Cover",
    text: "What does Sanasa Comprehensive Motor Insurance cover?",
    bgColor: "#eef2ff",
    borderColor: "#c7d2fe",
    textColor: "#4338ca",
  },
  {
    label: "🚨 24/7 Hotline",
    text: "What is the 24/7 Sanasa emergency accident hotline?",
    bgColor: "#f0fdfa",
    borderColor: "#99f6e4",
    textColor: "#0f766e",
  },
];

export default function AIChatBot({ userRole = "policy_holder", bottomOffset = 90 }: AIChatBotProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [supportInputText, setSupportInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSupportSending, setIsSupportSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Hello! I am **Sanasa AI**, your vehicle insurance assistant.\n\nI can help you with:\n• Claim details (enter your Claim ID like `CLM-0000-0014`)\n• Checking your registered claims & vehicles\n• Step-by-step accident claims & required documents\n• 24/7 emergency roadside assistance across Sri Lanka\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([
    {
      id: "supp-welcome",
      sender: "ai",
      text: "👋 Welcome to Sanasa General Insurance Customer Care & Helpdesk.\n\nOur live support officers are available to assist with policy renewals, active claim inquiries, and 24/7 emergency towing across Sri Lanka.\n\nHow can we help you right now?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
  const supportScrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for online indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleSend = async (manualText?: string) => {
    const textToSend = (manualText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!manualText) setInputText("");
    setIsLoading(true);
    scrollToBottom();

    // Retrieve logged in user info from AsyncStorage
    let userNic = "";
    let userEmail = "";
    let userName = "";
    try {
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        userNic = u.nic || "";
        userEmail = u.email || "";
        userName = u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "";
      }
    } catch (e) {
      console.warn("Could not read logged_in_user from AsyncStorage", e);
    }

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          userRole,
          userNic,
          userEmail,
          userName,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "I am currently unable to fetch an answer. Please dial 011-2303300 for 24/7 Sanasa Vehicle Assistance.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("AI Chat send error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Connection to Sanasa AI failed. Please check your network or call the Sanasa 24/7 Accident Hotline at **011-2303300**.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: "Conversation cleared. How can I assist you with your vehicle insurance or claim?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper to render bold text, bullet points, clickable links, and code pills
  const renderFormattedText = (text: string, isUser: boolean) => {
    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      // Check for markdown link: [label](url)
      const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch && !isUser) {
        const label = linkMatch[1];
        const rawUrl = linkMatch[2];
        const targetUrl = rawUrl.startsWith("http")
          ? rawUrl
          : `${API_BASE_URL}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

        return (
          <TouchableOpacity
            key={lIdx}
            activeOpacity={0.8}
            style={styles.linkBadge}
            onPress={() => {
              Linking.openURL(targetUrl).catch((err) =>
                console.warn("Could not open link:", err)
              );
            }}
          >
            <Ionicons name="document-text-outline" size={14} color="#0284c7" />
            <Text style={styles.linkBadgeText}>
              {label.replace(/^\/api\/claims\//, "Claim Report ")}
            </Text>
            <Ionicons name="open-outline" size={12} color="#0284c7" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");

      return (
        <View key={lIdx} style={[styles.textLineWrap, isBullet ? styles.bulletLineWrap : null]}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.aiMessageText,
            ]}
          >
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <Text key={pIdx} style={styles.boldText}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              if (part.startsWith("`") && part.endsWith("`") && !isUser) {
                const codeVal = part.slice(1, -1);
                return (
                  <Text
                    key={pIdx}
                    onPress={() => handleSend(codeVal)}
                    style={styles.codeTextPressable}
                  >
                    {" "}{codeVal}{" "}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        </View>
      );
    });
  };

  const handleSupportSend = async () => {
    const text = supportInputText.trim();
    if (!text || isSupportSending) return;

    const userMsg: ChatMessage = {
      id: `supp-user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setSupportMessages((prev) => [...prev, userMsg]);
    setSupportInputText("");
    setIsSupportSending(true);
    setTimeout(() => supportScrollRef.current?.scrollToEnd({ animated: true }), 100);

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `supp-rep-${Date.now()}`,
        sender: "ai",
        text: "Thank you for reaching Sanasa Support! A customer service officer has received your message and will review your file immediately. For urgent roadside assistance, call our 24/7 hotline at 1301 or 011 280 9200.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSupportMessages((prev) => [...prev, replyMsg]);
      setIsSupportSending(false);
      setTimeout(() => supportScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1000);
  };

  return (
    <>
      {/* ─── Floating Action Buttons: Support Chat & AI Chat ─── */}
      <View style={[styles.fabContainer, { bottom: bottomOffset }]} pointerEvents="box-none">
        {/* Support Chat Button (Cyan - matching Web) */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.supportFabTouch}
          onPress={() => setSupportModalVisible(true)}
        >
          <View style={styles.supportFabCircle}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#ffffff" />
          </View>
        </TouchableOpacity>

        {/* AI Chat Button (Navy/Sky Gradient with Robot) */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.fabTouch}
          onPress={() => {
            setModalVisible(true);
            scrollToBottom();
          }}
        >
          <LinearGradient
            colors={["#0a192f", "#0f2d4a", "#0284c7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabCircle}
          >
            <MaterialCommunityIcons name="robot" size={24} color="#ffffff" />
            <Animated.View style={[styles.onlineDot, { transform: [{ scale: pulseAnim }] }]} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ─── Colorful Popup Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          {/* Dimmed backdrop - tap to close */}
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.backdropDismiss} />
          </TouchableWithoutFeedback>

          {/* Elevated Popup Card Sheet */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.popupSheet}
          >
            {/* Top Drag Handle Notch */}
            <View style={styles.notchContainer}>
              <View style={styles.notchPill} />
            </View>

            {/* Vibrant Gradient Header */}
            <LinearGradient
              colors={["#0a192f", "#0f2d4a", "#0284c7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.popupHeader}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerAvatar}>
                  <MaterialCommunityIcons name="robot" size={20} color="#00ddff" />
                  <View style={styles.avatarOnlineDot} />
                </View>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>Sanasa AI Assistant</Text>
                    <Ionicons name="checkmark-circle" size={13} color="#00ddff" style={styles.verifiedBadge} />
                  </View>
                  <Text style={styles.headerSubtitle}>Vehicle Insurance Specialist • Online</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={clearChat}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh-outline" size={17} color="#93c5fd" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.headerActionBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Colorful Quick Prompts Bar */}
            <View style={styles.quickPromptsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPromptsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {QUICK_PROMPTS.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.75}
                    style={[
                      styles.quickPromptChip,
                      { backgroundColor: prompt.bgColor, borderColor: prompt.borderColor },
                    ]}
                    onPress={() => handleSend(prompt.text)}
                    disabled={isLoading}
                  >
                    <Text style={[styles.quickPromptText, { color: prompt.textColor }]}>
                      {prompt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Message Stream */}
            <View style={styles.messagesWrapper}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        isUser ? styles.userMessageRow : styles.aiMessageRow,
                      ]}
                    >
                      {!isUser && (
                        <View style={styles.aiBubbleAvatar}>
                          <MaterialCommunityIcons name="robot" size={14} color="#ffffff" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          isUser ? styles.userBubble : styles.aiBubble,
                        ]}
                      >
                        {renderFormattedText(msg.text, isUser)}
                        <Text
                          style={[
                            styles.timestampText,
                            isUser ? styles.userTimestamp : styles.aiTimestamp,
                          ]}
                        >
                          {msg.timestamp}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Typing status */}
                {isLoading && (
                  <View style={[styles.messageRow, styles.aiMessageRow]}>
                    <View style={styles.aiBubbleAvatar}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                      <Text style={styles.typingText}>Sanasa AI is analyzing...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Clean Colorful Input Bar */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask about vehicle claims, coverages..."
                  placeholderTextColor="#94a3b8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={300}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleSend()}
                  disabled={!inputText.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.disclaimerText}>
                Sanasa General Insurance • <Text style={styles.disclaimerAccent}>Motor AI Assistant</Text>
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── Support Live Helpdesk Modal ─── */}
      <Modal
        visible={supportModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          <TouchableWithoutFeedback onPress={() => setSupportModalVisible(false)}>
            <View style={styles.backdropDismiss} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.popupSheet}
          >
            {/* Header */}
            <LinearGradient
              colors={["#00b4d8", "#0077b6", "#03045e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.popupHeader}
            >
              <View style={styles.headerLeft}>
                <View style={[styles.headerAvatar, { backgroundColor: "rgba(255, 255, 255, 0.2)", borderColor: "rgba(255, 255, 255, 0.4)" }]}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#ffffff" />
                </View>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>Sanasa Support Helpdesk</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>Live Customer Care & Emergency Assist</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => setSupportModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Quick Contact Buttons Row */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
              <TouchableOpacity
                onPress={() => Linking.openURL("tel:1301")}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#0284c7", paddingVertical: 8, borderRadius: 10 }}
              >
                <Ionicons name="call" size={13} color="#ffffff" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#ffffff" }}>Hotline 1301</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL("mailto:claims@sanasainsurance.lk")}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac", paddingVertical: 8, borderRadius: 10 }}
              >
                <Ionicons name="mail" size={13} color="#15803d" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803d" }}>Email Support</Text>
              </TouchableOpacity>
            </View>

            {/* Messages Scroll Body */}
            <View style={styles.messagesWrapper}>
              <ScrollView
                ref={supportScrollRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {supportMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        isUser ? styles.userMessageRow : styles.aiMessageRow,
                      ]}
                    >
                      {!isUser && (
                        <View style={[styles.aiBubbleAvatar, { backgroundColor: "#00ddff" }]}>
                          <Ionicons name="headset" size={13} color="#ffffff" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          isUser ? styles.userBubble : [styles.aiBubble, { borderColor: "#bae6fd" }],
                        ]}
                      >
                        {renderFormattedText(msg.text, isUser)}
                        <Text
                          style={[
                            styles.timestampText,
                            isUser ? styles.userTimestamp : styles.aiTimestamp,
                          ]}
                        >
                          {msg.timestamp}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {isSupportSending && (
                  <View style={[styles.messageRow, styles.aiMessageRow]}>
                    <View style={[styles.aiBubbleAvatar, { backgroundColor: "#00ddff" }]}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                      <Text style={styles.typingText}>Support agent typing...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type message to Sanasa Support..."
                  placeholderTextColor="#94a3b8"
                  value={supportInputText}
                  onChangeText={setSupportInputText}
                  multiline
                  maxLength={300}
                  editable={!isSupportSending}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: "#00ddff" },
                    (!supportInputText.trim() || isSupportSending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSupportSend}
                  disabled={!supportInputText.trim() || isSupportSending}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.disclaimerText}>
                Sanasa General Insurance • <Text style={[styles.disclaimerAccent, { color: "#00ddff" }]}>Live Helpdesk Support</Text>
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Floating Action Button */
  fabContainer: {
    position: "absolute",
    right: 18,
    zIndex: 9999,
    alignItems: "center",
  },
  supportFabTouch: {
    borderRadius: 25,
    shadowColor: "#00ddff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 10,
  },
  supportFabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#00ddff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  fabTouch: {
    borderRadius: 25,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  fabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  onlineDot: {
    position: "absolute",
    top: 3,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#0a192f",
  },

  /* Popup Overlay & Sheet */
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 25, 47, 0.6)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  popupSheet: {
    height: SCREEN_H * 0.82,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 25,
  },

  /* Drag Notch */
  notchContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#0a192f",
  },
  notchPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(56, 189, 248, 0.4)",
  },

  /* Gradient Header */
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "#00ddff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    borderWidth: 1.5,
    borderColor: "#0f2d4a",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    marginTop: 1,
  },
  headerSubtitle: {
    color: "#93c5fd",
    fontSize: 10.5,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Quick Prompts Bar */
  quickPromptsBar: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 7,
  },
  quickPromptsScroll: {
    paddingHorizontal: 14,
    gap: 7,
  },
  quickPromptChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Messages Area */
  messagesWrapper: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    marginVertical: 2,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  aiMessageRow: {
    justifyContent: "flex-start",
  },
  aiBubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  messageBubble: {
    maxWidth: SCREEN_W * 0.78,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#0f2d4a",
    borderBottomRightRadius: 2,
    shadowColor: "#0f2d4a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#e0f2fe",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  typingBubble: {
    backgroundColor: "#ffffff",
    borderStyle: "dashed",
    borderColor: "#bae6fd",
  },
  typingText: {
    fontSize: 11.5,
    color: "#0284c7",
    fontStyle: "italic",
    fontWeight: "500",
  },
  messageText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  userMessageText: {
    color: "#ffffff",
  },
  aiMessageText: {
    color: "#0f172a",
  },
  textLineWrap: {
    marginVertical: 1,
  },
  bulletLineWrap: {
    paddingLeft: 4,
  },
  bulletLine: {
    marginVertical: 1,
  },
  boldText: {
    fontWeight: "800",
  },
  linkBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: "flex-start",
  },
  linkBadgeText: {
    fontSize: 11.5,
    color: "#0284c7",
    fontWeight: "700",
    marginLeft: 4,
    textDecorationLine: "underline",
  },
  codeTextPressable: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11.5,
    textDecorationLine: "underline",
  },
  timestampText: {
    fontSize: 9,
    marginTop: 3,
    textAlign: "right",
  },
  userTimestamp: {
    color: "#7dd3fc",
  },
  aiTimestamp: {
    color: "#94a3b8",
  },

  /* Compact Rounded Input Bar */
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 80,
    minHeight: 34,
    fontSize: 12.5,
    color: "#0f172a",
    paddingTop: 7,
    paddingBottom: 7,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 9.5,
    color: "#94a3b8",
    marginTop: 5,
    fontWeight: "500",
  },
  disclaimerAccent: {
    color: "#0284c7",
    fontWeight: "700",
  },
});
