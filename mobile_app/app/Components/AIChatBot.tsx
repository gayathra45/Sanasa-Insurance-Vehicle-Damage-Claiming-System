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
  Keyboard,
} from "react-native";
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
  { label: "🚗 File Accident Claim", text: "How do I file a vehicle accident claim step-by-step?" },
  { label: "🛡️ Comprehensive Cover", text: "What does Sanasa Comprehensive Motor Insurance cover?" },
  { label: "📋 Required Documents", text: "What documents do I need to submit for an accident claim?" },
  { label: "🚨 24/7 Hotline", text: "What is the 24/7 Sanasa emergency accident hotline?" },
];

export default function AIChatBot({ userRole = "policy_holder", bottomOffset = 90 }: AIChatBotProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "👋 Hello! I am **Sanasa AI**, your dedicated Vehicle & Motor Insurance assistant.\n\nI can help you with accident claims, coverages, required documents, and 24/7 emergency roadside assistance across Sri Lanka.\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
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
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "I am currently unable to fetch an answer. Please dial 011-2303300 for 24/7 Sanasa Vehicle Assistance.";

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
        text: "Chat cleared. How can I help you with your vehicle insurance or claim?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper to render bold text and bullet points cleanly
  const renderFormattedText = (text: string, isUser: boolean) => {
    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <Text
          key={lIdx}
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText,
            line.trim().startsWith("•") || line.trim().startsWith("-") ? styles.bulletLine : null,
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
            return part;
          })}
        </Text>
      );
    });
  };

  return (
    <>
      {/* ─── Floating Circular AI Button ─── */}
      <View style={[styles.fabContainer, { bottom: bottomOffset }]} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.fabTouch}
          onPress={() => {
            setModalVisible(true);
            scrollToBottom();
          }}
        >
          <LinearGradient
            colors={["#0a192f", "#0d2a3a", "#0284c7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabCircle}
          >
            <MaterialCommunityIcons name="robot" size={26} color="#ffffff" />
            <Animated.View style={[styles.onlineDot, { transform: [{ scale: pulseAnim }] }]} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ─── Modern Popup Card / Bottom Sheet Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          {/* Dimmed backdrop area - tap to close */}
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

            {/* Popup Header */}
            <LinearGradient
              colors={["#0a192f", "#0f2d4a", "#1e3a8a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.popupHeader}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerAvatar}>
                  <MaterialCommunityIcons name="robot" size={22} color="#38bdf8" />
                  <View style={styles.avatarOnlineDot} />
                </View>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>Sanasa AI Assistant</Text>
                    <Ionicons name="checkmark-circle" size={13} color="#38bdf8" style={styles.verifiedBadge} />
                  </View>
                  <Text style={styles.headerSubtitle}>Vehicle & Motor Insurance Specialist</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={clearChat}
                  style={styles.headerBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh-outline" size={17} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.headerBtn, styles.headerCloseBtn]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={17} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Quick Prompts Bar */}
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
                    style={styles.quickPromptChip}
                    onPress={() => handleSend(prompt.text)}
                    disabled={isLoading}
                  >
                    <Text style={styles.quickPromptText}>{prompt.label}</Text>
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
                          <MaterialCommunityIcons name="robot" size={15} color="#0284c7" />
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
                      <ActivityIndicator size="small" color="#0284c7" />
                    </View>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                      <View style={styles.typingDotRow}>
                        <View style={styles.typingDot} />
                        <View style={[styles.typingDot, { opacity: 0.7 }]} />
                        <View style={[styles.typingDot, { opacity: 0.4 }]} />
                      </View>
                      <Text style={styles.typingText}>Sanasa AI is thinking...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Compact Clean Input Bar */}
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
                Sanasa General Insurance PLC • Official Motor AI Assistant
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
  },
  fabTouch: {
    borderRadius: 28,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    position: "relative",
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
    borderColor: "#0d2a3a",
  },

  /* Popup Overlay & Sheet */
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 25, 47, 0.62)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  popupSheet: {
    height: SCREEN_H * 0.82,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderBottomWidth: 0,
  },

  /* Notch Handle */
  notchContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: "#0a192f",
  },
  notchPill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },

  /* Header */
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1.5,
    borderColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
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
    color: "#94a3b8",
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCloseBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.85)",
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e293b",
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
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
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
    borderBottomRightRadius: 3,
    shadowColor: "#0f2d4a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  typingBubble: {
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderStyle: "dashed",
  },
  typingDotRow: {
    flexDirection: "row",
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#0284c7",
  },
  typingText: {
    fontSize: 11.5,
    color: "#64748b",
    fontStyle: "italic",
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
  bulletLine: {
    marginVertical: 1,
  },
  boldText: {
    fontWeight: "800",
  },
  timestampText: {
    fontSize: 9,
    marginTop: 3,
    textAlign: "right",
  },
  userTimestamp: {
    color: "#94a3b8",
  },
  aiTimestamp: {
    color: "#94a3b8",
  },

  /* Compact Input Bar */
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
    borderColor: "#e2e8f0",
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
    backgroundColor: "#0f2d4a",
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
});
