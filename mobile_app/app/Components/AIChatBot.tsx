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
  SafeAreaView,
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
  const fabScale = useRef(new Animated.Value(1)).current;

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

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);
    scrollToBottom();

    try {
      // Map history for Gemini API
      const history = newMessages.slice(-8).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
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
      // Parse markdown bold **text**
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
      {/* ─── Simple Clean Floating AI Icon ─── */}
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

      {/* ─── Full Chat Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          {/* Header */}
          <LinearGradient
            colors={["#0a192f", "#0d2a3a", "#1e3a8a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <MaterialCommunityIcons name="robot" size={24} color="#38bdf8" />
                <View style={styles.avatarOnlineDot} />
              </View>
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>Sanasa AI Assistant</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#38bdf8" />
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>Vehicle & Motor Insurance Specialist</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={clearChat}
                style={styles.headerBtn}
                title="Clear chat"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.headerBtn, styles.headerCloseBtn]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Quick Prompts Bar */}
          <View style={styles.quickPromptsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
              {QUICK_PROMPTS.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={styles.quickPromptChip}
                  onPress={() => handleSend(prompt.text)}
                  disabled={isLoading}
                >
                  <Text style={styles.quickPromptText}>{prompt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Messages ScrollView */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.chatBody}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          >
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
                        <MaterialCommunityIcons name="shield-car" size={18} color="#0284c7" />
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

              {/* Typing indicator */}
              {isLoading && (
                <View style={[styles.messageRow, styles.aiMessageRow]}>
                  <View style={styles.aiBubbleAvatar}>
                    <ActivityIndicator size="small" color="#0284c7" />
                  </View>
                  <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                    <Text style={styles.typingText}>Sanasa AI is analyzing vehicle guidelines...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask about vehicle claims, policies, covers..."
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
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.disclaimerText}>
                Sanasa General Insurance PLC • Dedicated Vehicle & Motor Insurance AI
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Floating Action Button */
  fabContainer: {
    position: "absolute",
    right: 16,
    zIndex: 9999,
  },
  fabTouch: {
    borderRadius: 27,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    top: 2,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#0d2a3a",
  },

  /* Modal Root */
  modalRoot: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#0d2a3a",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    marginTop: 1,
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCloseBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },

  /* Quick Prompts Bar */
  quickPromptsContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickPromptText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },

  /* Chat Body */
  chatBody: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 3,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  aiMessageRow: {
    justifyContent: "flex-start",
  },
  aiBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: SCREEN_W * 0.76,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#0d2a3a",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  typingBubble: {
    backgroundColor: "#f8fafc",
    borderStyle: "dashed",
  },
  typingText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMessageText: {
    color: "#ffffff",
  },
  aiMessageText: {
    color: "#1e293b",
  },
  bulletLine: {
    marginVertical: 1,
  },
  boldText: {
    fontWeight: "800",
  },
  timestampText: {
    fontSize: 9.5,
    marginTop: 4,
    textAlign: "right",
  },
  userTimestamp: {
    color: "#94a3b8",
  },
  aiTimestamp: {
    color: "#94a3b8",
  },

  /* Input Bar */
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8fafc",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 90,
    minHeight: 36,
    fontSize: 13,
    color: "#0f172a",
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.5,
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 6,
    fontWeight: "500",
  },
});
