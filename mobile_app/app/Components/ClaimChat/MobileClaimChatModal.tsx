import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Image,
  Linking,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../../_config";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export interface MobileClaimChatModalProps {
  visible: boolean;
  onClose: () => void;
  userRole?: "policy_holder" | "agent";
  initialClaimNumber?: string;
  onUnreadCountChange?: (count: number) => void;
}

type MainCategory = "recent" | "claims" | "branches" | "agents";

interface UserSession {
  userId: string;
  userType: "PolicyHolder" | "Agent" | "OfficeStaff" | "Admin";
  name: string;
  email: string;
  branch: string;
  profilePhoto?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "other";
  text: string;
  senderName?: string;
  senderPhoto?: string;
  senderRole?: string;
  attachments?: { name: string; url: string; fileType: string; size?: number }[];
  timestamp: string;
}

interface ConversationItem {
  _id: string;
  claimNumber: string;
  vehiclePlate?: string;
  type?: string;
  otherParticipant: {
    userId: string;
    userType: string;
    name: string;
    email?: string;
    role?: string;
    branch?: string;
    profilePhoto?: string;
  };
  lastMessage?: {
    text: string;
    senderId?: string;
    senderName?: string;
    sentAt?: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface ClaimItem {
  _id?: string;
  claimNumber: string;
  vehiclePlate?: string;
  incidentDate?: string;
  status?: string;
  branch?: string;
  assignedAgent?: string;
}

interface DirectoryItem {
  id: string;
  name: string;
  email: string;
  branch?: string;
  profilePhoto?: string;
  role?: string;
}

export default function MobileClaimChatModal({
  visible,
  onClose,
  userRole = "policy_holder",
  initialClaimNumber,
  onUnreadCountChange,
}: MobileClaimChatModalProps) {
  const [activeCategory, setActiveCategory] = useState<MainCategory>("recent");
  const [activeView, setActiveView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const [userSession, setUserSession] = useState<UserSession>({
    userId: "",
    userType: userRole === "agent" ? "Agent" : "PolicyHolder",
    name: "",
    email: "",
    branch: "",
    profilePhoto: "",
  });

  // Data lists
  const [recentConversations, setRecentConversations] = useState<ConversationItem[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [branches, setBranches] = useState<DirectoryItem[]>([]);
  const [agents, setAgents] = useState<DirectoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Active chat state
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [activeClaimContext, setActiveClaimContext] = useState<ClaimItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; base64?: string; name: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  const lastUnreadCountRef = useRef<number>(-1);

  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  // 1. Fetch logged in session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const userStr = await AsyncStorage.getItem("logged_in_user");
        const agentStr = await AsyncStorage.getItem("logged_in_agent");
        if (userRole === "agent" && agentStr) {
          const a = JSON.parse(agentStr);
          setUserSession({
            userId: String(a.agentId || a._id || a.id || "AGENT"),
            userType: "Agent",
            name: a.name || "Field Agent",
            email: a.email || "",
            branch: a.branch || "Head Office",
            profilePhoto: a.profilePhoto || "",
          });
        } else if (userStr) {
          const u = JSON.parse(userStr);
          setUserSession({
            userId: String(u.nic || u._id || "PH-USER"),
            userType: "PolicyHolder",
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Policyholder",
            email: u.email || "",
            branch: u.branch || "Head Office",
            profilePhoto: u.profilePhoto || "",
          });
        }
      } catch (err) {
        console.warn("Error reading chat user session:", err);
      }
    };
    fetchSession();
  }, [userRole]);

  // 2. Load conversations, claims, directory
  const loadData = useCallback(async (isInitial = false) => {
    if (!userSession.userId) return;
    if (isInitial || recentConversations.length === 0) {
      setLoadingList(true);
    }
    try {
      // Fetch recent conversations, claims, directory in parallel
      const [convRes, claimRes, dirRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/claim-chat/conversations?userId=${encodeURIComponent(userSession.userId)}&userType=${encodeURIComponent(userSession.userType)}`),
        fetch(`${API_BASE_URL}/api/claim-chat/claims?userId=${encodeURIComponent(userSession.userId)}&userType=${encodeURIComponent(userSession.userType)}`),
        fetch(`${API_BASE_URL}/api/claim-chat/directory`),
      ]);

      if (convRes.ok) {
        const d = await convRes.json();
        const convs = d.conversations || [];
        setRecentConversations(convs);
        const totalUnread = convs.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        if (lastUnreadCountRef.current !== totalUnread) {
          lastUnreadCountRef.current = totalUnread;
          onUnreadCountChangeRef.current?.(totalUnread);
        }
      }

      if (claimRes.ok) {
        const cd = await claimRes.json();
        setClaims(cd.claims || []);
      }

      if (dirRes.ok) {
        const dd = await dirRes.json();
        setBranches(dd.branches || []);
        setAgents(dd.agents || []);
      }
    } catch (err) {
      console.warn("loadData error:", err);
    } finally {
      setLoadingList(false);
    }
  }, [userSession.userId, userSession.userType]);

  useEffect(() => {
    if (visible && userSession.userId) {
      loadData(true);
      if (initialClaimNumber) {
        setActiveCategory("claims");
      }
    }
  }, [visible, userSession.userId, initialClaimNumber, loadData]);

  // 3. Load active conversation messages and setup polling
  useEffect(() => {
    if (!visible || activeView !== "chat" || !activeConversation?._id) return;
    let isSubscribed = true;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/claim-chat/conversations/${activeConversation._id}/messages`);
        if (res.ok) {
          const d = await res.json();
          const serverMsgs: any[] = d.messages || [];
          if (isSubscribed) {
            setMessages((prev) => {
              if (
                prev.length === serverMsgs.length &&
                prev.length > 0 &&
                prev[prev.length - 1].id === serverMsgs[serverMsgs.length - 1]._id
              ) {
                return prev;
              }
              return serverMsgs.map((m) => ({
                id: m._id,
                sender: String(m.senderId) === String(userSession.userId) ? "user" : "other",
                text: m.text || "",
                senderName: m.senderName,
                senderPhoto: m.senderPhoto,
                senderRole: m.senderRole,
                attachments: m.attachments,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }));
            });
          }
        }

        // Mark read
        fetch(`${API_BASE_URL}/api/claim-chat/conversations/${activeConversation._id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userSession.userId, userType: userSession.userType }),
        }).catch(() => {});
      } catch (err) {
        console.warn("fetchMessages error:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [visible, activeView, activeConversation?._id, userSession.userId]);

  // 4. Start or open conversation
  const openDirectChat = async (recipient: {
    userId: string;
    userType: string;
    name: string;
    email?: string;
    role?: string;
    branch?: string;
    profilePhoto?: string;
  }, claimNumber = "DIRECT-SUPPORT", vehiclePlate = "") => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimNumber,
          sender: {
            userId: userSession.userId || "USER",
            userType: userSession.userType,
            name: userSession.name || "Customer",
            email: userSession.email || "",
            branch: userSession.branch || "Head Office",
            profilePhoto: userSession.profilePhoto || "",
          },
          recipient: {
            userId: String(recipient.userId),
            userType: recipient.userType,
            name: recipient.name,
            email: recipient.email || "",
            role: recipient.role || recipient.userType,
            branch: recipient.branch || "Head Office",
            profilePhoto: recipient.profilePhoto || "",
          },
          type: "direct",
        }),
      });

      if (res.ok) {
        const d = await res.json();
        const conv = d.conversation;
        const convItem: ConversationItem = {
          _id: conv._id,
          claimNumber: conv.claimNumber || claimNumber,
          vehiclePlate: conv.vehiclePlate || vehiclePlate,
          type: conv.type,
          otherParticipant: recipient,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        };
        setActiveConversation(convItem);
        setActiveView("chat");
        setMessages([]);
      }
    } catch (err) {
      console.warn("openDirectChat error:", err);
      Alert.alert("Error", "Could not start conversation. Please try again.");
    }
  };

  // Open existing conversation
  const selectExistingConversation = (conv: ConversationItem) => {
    setActiveConversation(conv);
    setActiveView("chat");
    setMessages([]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  // 5. Pick photo
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant photo library access to attach pictures.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedPhoto({
          uri: asset.uri,
          base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
          name: asset.fileName || `claim_photo_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }
    } catch (err) {
      console.warn("handlePickPhoto error:", err);
    }
  };

  // 6. Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedPhoto) || isSending || !activeConversation?._id) return;

    setIsSending(true);
    const photoToUpload = selectedPhoto;
    setSelectedPhoto(null);
    setInputText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "user",
      text,
      attachments: photoToUpload ? [{ name: photoToUpload.name, url: photoToUpload.uri, fileType: "image/jpeg" }] : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const payload: any = {
        senderId: userSession.userId || "USER",
        senderType: userSession.userType,
        senderName: userSession.name || "User",
        senderEmail: userSession.email || "",
        senderRole: userSession.userType === "Agent" ? "Assigned Agent" : "Policyholder",
        senderPhoto: userSession.profilePhoto || "",
        text,
      };

      if (photoToUpload?.base64) {
        payload.attachments = [
          {
            data: photoToUpload.base64,
            name: photoToUpload.name,
            fileType: photoToUpload.type,
          },
        ];
      }

      const res = await fetch(`${API_BASE_URL}/api/claim-chat/conversations/${activeConversation._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    id: data.message._id,
                    sender: "user",
                    text: data.message.text || "",
                    senderName: data.message.senderName,
                    senderPhoto: data.message.senderPhoto,
                    attachments: data.message.attachments,
                    timestamp: new Date(data.message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  }
                : m
            )
          );
        }
      }
    } catch (err) {
      console.warn("handleSend error:", err);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Filter items by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredConversations = recentConversations.filter((c) => {
    if (!query) return true;
    const name = c.otherParticipant?.name?.toLowerCase() || "";
    const claim = c.claimNumber?.toLowerCase() || "";
    const plate = c.vehiclePlate?.toLowerCase() || "";
    const lastMsg = c.lastMessage?.text?.toLowerCase() || "";
    return name.includes(query) || claim.includes(query) || plate.includes(query) || lastMsg.includes(query);
  });

  const filteredClaims = claims.filter((cl) => {
    if (!query) return true;
    const num = cl.claimNumber?.toLowerCase() || "";
    const plate = cl.vehiclePlate?.toLowerCase() || "";
    const branch = cl.branch?.toLowerCase() || "";
    return num.includes(query) || plate.includes(query) || branch.includes(query);
  });

  const filteredBranches = branches.filter((b) => {
    if (!query) return true;
    const name = b.name?.toLowerCase() || "";
    const branch = b.branch?.toLowerCase() || "";
    return name.includes(query) || branch.includes(query);
  });

  const filteredAgents = agents.filter((a) => {
    if (!query) return true;
    const name = a.name?.toLowerCase() || "";
    const branch = a.branch?.toLowerCase() || "";
    return name.includes(query) || branch.includes(query);
  });

  const getStatusColor = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("approved")) return { bg: "#ecfdf5", border: "#a7f3d0", text: "#059669" };
    if (s.includes("review") || s.includes("assigned")) return { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" };
    if (s.includes("rejected")) return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
    return { bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={false}
      onRequestClose={() => {
        if (activeView === "chat") {
          setActiveView("list");
        } else {
          onClose();
        }
      }}
    >
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a192f" />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: CATEGORIES & DIRECTORY (INBOX) LIST                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeView === "list" && (
          <View style={styles.mainContainer}>
            {/* Top Brand Header */}
            <LinearGradient
              colors={["#0a192f", "#0f2d4a", "#0284c7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#00ddff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Sanasa Claim Messenger</Text>
                  <Text style={styles.headerSub}>
                    {userSession.name || "Customer Care"} • {userSession.branch || "General Desk"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Search Input Bar */}
            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={17} color="#64748b" style={{ marginLeft: 4 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search claims, branches, agents, chats..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Navigation Tabs */}
            <View style={styles.categoryTabsBar}>
              <TouchableOpacity
                onPress={() => setActiveCategory("recent")}
                style={[styles.categoryTab, activeCategory === "recent" && styles.categoryTabActive]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={15}
                  color={activeCategory === "recent" ? "#0284c7" : "#64748b"}
                />
                <Text style={[styles.categoryTabText, activeCategory === "recent" && styles.categoryTabTextActive]}>
                  Recent
                </Text>
                {recentConversations.some((c) => c.unreadCount > 0) && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {recentConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveCategory("claims")}
                style={[styles.categoryTab, activeCategory === "claims" && styles.categoryTabActive]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={activeCategory === "claims" ? "#0284c7" : "#64748b"}
                />
                <Text style={[styles.categoryTabText, activeCategory === "claims" && styles.categoryTabTextActive]}>
                  My Claims
                </Text>
                {claims.length > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: "#e0f2fe" }]}>
                    <Text style={[styles.tabBadgeText, { color: "#0284c7" }]}>{claims.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveCategory("branches")}
                style={[styles.categoryTab, activeCategory === "branches" && styles.categoryTabActive]}
              >
                <Ionicons
                  name="business-outline"
                  size={15}
                  color={activeCategory === "branches" ? "#0284c7" : "#64748b"}
                />
                <Text style={[styles.categoryTabText, activeCategory === "branches" && styles.categoryTabTextActive]}>
                  Branches
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveCategory("agents")}
                style={[styles.categoryTab, activeCategory === "agents" && styles.categoryTabActive]}
              >
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={activeCategory === "agents" ? "#0284c7" : "#64748b"}
                />
                <Text style={[styles.categoryTabText, activeCategory === "agents" && styles.categoryTabTextActive]}>
                  Agents
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick 24/7 Hotline Bar */}
            <View style={styles.hotlineBar}>
              <TouchableOpacity
                style={styles.hotlinePill}
                onPress={() => Linking.openURL("tel:1301")}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={12} color="#ffffff" />
                <Text style={styles.hotlinePillText}>24/7 Accident Hotline: 1301</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emailPill}
                onPress={() => Linking.openURL("mailto:claims@sanasainsurance.lk")}
                activeOpacity={0.8}
              >
                <Ionicons name="mail" size={12} color="#0284c7" />
                <Text style={styles.emailPillText}>claims@sanasainsurance.lk</Text>
              </TouchableOpacity>
            </View>

            {/* List Body */}
            {loadingList ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.centerText}>Loading claim communications...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollList}
                contentContainerStyle={styles.scrollListContent}
                showsVerticalScrollIndicator={false}
              >
                {/* ─── TAB 1: RECENT CONVERSATIONS ─── */}
                {activeCategory === "recent" && (
                  <>
                    {filteredConversations.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No conversations yet</Text>
                        <Text style={styles.emptySubtitle}>
                          Select a claim from "My Claims" or pick a Branch / Agent below to start live chatting.
                        </Text>
                        <TouchableOpacity
                          style={styles.startClaimBtn}
                          onPress={() => setActiveCategory("claims")}
                        >
                          <Text style={styles.startClaimBtnText}>View My Claims</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      filteredConversations.map((c) => {
                        const recipient = c.otherParticipant || {};
                        const hasUnread = c.unreadCount > 0;
                        return (
                          <TouchableOpacity
                            key={c._id}
                            style={[styles.convItemCard, hasUnread && styles.convItemCardUnread]}
                            onPress={() => selectExistingConversation(c)}
                            activeOpacity={0.75}
                          >
                            {recipient.profilePhoto ? (
                              <Image source={{ uri: recipient.profilePhoto }} style={styles.convAvatar} />
                            ) : (
                              <View style={styles.convAvatarFallback}>
                                <Text style={styles.convAvatarFallbackText}>
                                  {(recipient.name || "S").slice(0, 2).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.convItemBody}>
                              <View style={styles.convItemTopRow}>
                                <Text style={styles.convItemName} numberOfLines={1}>
                                  {recipient.name || "Customer Care"}
                                </Text>
                                <Text style={styles.convItemTime}>
                                  {c.lastMessage?.sentAt ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                </Text>
                              </View>
                              <View style={styles.convItemPillsRow}>
                                <Text style={styles.roleTag}>
                                  {recipient.role || recipient.userType || "Officer"}
                                </Text>
                                {c.claimNumber && c.claimNumber !== "DIRECT-SUPPORT" && (
                                  <Text style={styles.claimTag}>{c.claimNumber}</Text>
                                )}
                                {!!c.vehiclePlate && (
                                  <Text style={styles.plateTag}>{c.vehiclePlate}</Text>
                                )}
                              </View>
                              <Text
                                style={[styles.convItemSnippet, hasUnread && styles.convItemSnippetUnread]}
                                numberOfLines={1}
                              >
                                {c.lastMessage?.text || "Started conversation"}
                              </Text>
                            </View>
                            {hasUnread && (
                              <View style={styles.unreadCountBadge}>
                                <Text style={styles.unreadCountBadgeText}>{c.unreadCount}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                )}

                {/* ─── TAB 2: MY CLAIMS ─── */}
                {activeCategory === "claims" && (
                  <>
                    {filteredClaims.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No registered claims found</Text>
                        <Text style={styles.emptySubtitle}>
                          You can still contact our Galle or Colombo branch office directly in the Branches tab.
                        </Text>
                      </View>
                    ) : (
                      filteredClaims.map((cl) => {
                        const sColor = getStatusColor(cl.status);
                        return (
                          <View key={cl.claimNumber} style={styles.claimCard}>
                            <View style={styles.claimCardHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <Text style={styles.claimNumberText}>{cl.claimNumber}</Text>
                                  <View style={[styles.statusBadge, { backgroundColor: sColor.bg, borderColor: sColor.border }]}>
                                    <Text style={[styles.statusBadgeText, { color: sColor.text }]}>{cl.status || "In Review"}</Text>
                                  </View>
                                </View>
                                <Text style={styles.vehiclePlateText}>Vehicle: {cl.vehiclePlate || "Registered Vehicle"}</Text>
                              </View>
                            </View>

                            <View style={styles.claimCardMeta}>
                              <View style={styles.claimMetaItem}>
                                <Ionicons name="business" size={13} color="#64748b" />
                                <Text style={styles.claimMetaVal}>{cl.branch || "Head Office"}</Text>
                              </View>
                              {!!cl.assignedAgent && (
                                <View style={styles.claimMetaItem}>
                                  <Ionicons name="person" size={13} color="#64748b" />
                                  <Text style={styles.claimMetaVal}>Agent: {cl.assignedAgent}</Text>
                                </View>
                              )}
                            </View>

                            {/* Chat Actions for this claim */}
                            <View style={styles.claimActionsRow}>
                              <TouchableOpacity
                                style={styles.claimChatBtn}
                                onPress={() =>
                                  openDirectChat(
                                    {
                                      userId: cl.branch || "Head Office",
                                      userType: "OfficeStaff",
                                      name: `${cl.branch || "Head Office"} Branch Officer`,
                                      role: "Branch Officer",
                                      branch: cl.branch || "Head Office",
                                    },
                                    cl.claimNumber,
                                    cl.vehiclePlate
                                  )
                                }
                                activeOpacity={0.8}
                              >
                                <Ionicons name="business" size={14} color="#0284c7" />
                                <Text style={styles.claimChatBtnText}>Chat Branch Staff</Text>
                              </TouchableOpacity>

                              {!!cl.assignedAgent && (
                                <TouchableOpacity
                                  style={[styles.claimChatBtn, styles.claimChatBtnPrimary]}
                                  onPress={() =>
                                    openDirectChat(
                                      {
                                        userId: cl.assignedAgent || "AGENT",
                                        userType: "Agent",
                                        name: cl.assignedAgent || "Assigned Agent",
                                        role: "Assigned Agent",
                                        branch: cl.branch || "Head Office",
                                      },
                                      cl.claimNumber,
                                      cl.vehiclePlate
                                    )
                                  }
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="chatbubbles" size={14} color="#ffffff" />
                                  <Text style={[styles.claimChatBtnText, { color: "#ffffff" }]}>Chat Agent</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </>
                )}

                {/* ─── TAB 3: BRANCHES ─── */}
                {activeCategory === "branches" && (
                  <>
                    {filteredBranches.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="business-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No branches matched query</Text>
                      </View>
                    ) : (
                      filteredBranches.map((b) => (
                        <View key={b.id} style={styles.directoryCard}>
                          {b.profilePhoto ? (
                            <Image source={{ uri: b.profilePhoto }} style={styles.dirAvatar} />
                          ) : (
                            <View style={[styles.dirAvatarFallback, { backgroundColor: "#e0f2fe" }]}>
                              <Ionicons name="business" size={18} color="#0284c7" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dirName}>{b.name}</Text>
                            <Text style={styles.dirSub}>{b.email || "support@sanasa.lk"}</Text>
                            <Text style={styles.dirRoleBadge}>{b.role || "Branch Office"}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.dirActionBtn}
                            onPress={() =>
                              openDirectChat({
                                userId: b.id,
                                userType: "OfficeStaff",
                                name: b.name,
                                email: b.email,
                                role: "Branch Officer",
                                branch: b.branch,
                                profilePhoto: b.profilePhoto,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbubble-ellipses" size={15} color="#ffffff" />
                            <Text style={styles.dirActionBtnText}>Chat</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </>
                )}

                {/* ─── TAB 4: AGENTS ─── */}
                {activeCategory === "agents" && (
                  <>
                    {filteredAgents.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No agents matched query</Text>
                      </View>
                    ) : (
                      filteredAgents.map((a) => (
                        <View key={a.id} style={styles.directoryCard}>
                          {a.profilePhoto ? (
                            <Image source={{ uri: a.profilePhoto }} style={styles.dirAvatar} />
                          ) : (
                            <View style={[styles.dirAvatarFallback, { backgroundColor: "#fef3c7" }]}>
                              <Ionicons name="person" size={18} color="#d97706" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dirName}>{a.name}</Text>
                            <Text style={styles.dirSub}>{a.branch || "Field Operations"}</Text>
                            <Text style={[styles.dirRoleBadge, { color: "#d97706", backgroundColor: "#fffbeb" }]}>
                              Field Agent
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.dirActionBtn, { backgroundColor: "#d97706" }]}
                            onPress={() =>
                              openDirectChat({
                                userId: a.id,
                                userType: "Agent",
                                name: a.name,
                                email: a.email,
                                role: "Field Agent",
                                branch: a.branch,
                                profilePhoto: a.profilePhoto,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbubble-ellipses" size={15} color="#ffffff" />
                            <Text style={styles.dirActionBtnText}>Chat</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: ACTIVE CONVERSATION (FULL SCREEN CHAT)                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeView === "chat" && activeConversation && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.chatContainer}
          >
            {/* Conversation Header with Back Button */}
            <LinearGradient
              colors={["#0a192f", "#0f2d4a", "#0284c7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chatHeader}
            >
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setActiveView("list");
                  loadData();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
              </TouchableOpacity>

              {activeConversation.otherParticipant?.profilePhoto ? (
                <Image
                  source={{ uri: activeConversation.otherParticipant.profilePhoto }}
                  style={styles.chatHeaderAvatar}
                />
              ) : (
                <View style={styles.chatHeaderAvatarFallback}>
                  <Text style={styles.chatHeaderAvatarFallbackText}>
                    {(activeConversation.otherParticipant?.name || "S").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.chatHeaderMeta}>
                <Text style={styles.chatHeaderName} numberOfLines={1}>
                  {activeConversation.otherParticipant?.name || "Support Officer"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={styles.chatHeaderRole}>
                    {activeConversation.otherParticipant?.role || activeConversation.otherParticipant?.userType || "Support"}
                  </Text>
                  {activeConversation.claimNumber && activeConversation.claimNumber !== "DIRECT-SUPPORT" && (
                    <Text style={styles.chatHeaderClaimPill}>
                      {activeConversation.claimNumber}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatHeaderAction}
                onPress={() => Linking.openURL("tel:1301")}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={17} color="#00ddff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatHeaderAction}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Claim details context strip */}
            {activeConversation.claimNumber && activeConversation.claimNumber !== "DIRECT-SUPPORT" && (
              <View style={styles.claimContextStrip}>
                <Ionicons name="shield-checkmark" size={13} color="#0284c7" />
                <Text style={styles.claimContextText}>
                  Active Claim Discussion • <Text style={{ fontWeight: "700" }}>{activeConversation.claimNumber}</Text>
                  {activeConversation.vehiclePlate ? ` • ${activeConversation.vehiclePlate}` : ""}
                </Text>
              </View>
            )}

            {/* Message Stream */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="lock-closed-outline" size={32} color="#94a3b8" />
                  <Text style={[styles.emptyTitle, { fontSize: 13, marginTop: 8 }]}>Direct Secure Support Channel</Text>
                  <Text style={styles.emptySubtitle}>
                    All messages and photos sent here are synchronized directly with your branch officer and claims file.
                  </Text>
                </View>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === "user";
                  return (
                    <View
                      key={m.id}
                      style={[styles.messageRow, isUser ? styles.userMessageRow : styles.otherMessageRow]}
                    >
                      {!isUser && (
                        m.senderPhoto ? (
                          <Image source={{ uri: m.senderPhoto }} style={styles.senderPhotoAvatar} />
                        ) : (
                          <View style={styles.senderAvatarFallback}>
                            <Text style={styles.senderAvatarFallbackText}>
                              {(m.senderName || "O").slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )
                      )}

                      <View
                        style={[
                          styles.messageBubble,
                          isUser ? styles.userBubble : styles.otherBubble,
                        ]}
                      >
                        {!isUser && !!m.senderName && (
                          <Text style={styles.senderNameLabel}>{m.senderName}</Text>
                        )}

                        {/* Attachments */}
                        {m.attachments && m.attachments.length > 0 && (
                          <View style={styles.attachmentsGrid}>
                            {m.attachments.map((att, aIdx) =>
                              att.url ? (
                                <TouchableOpacity
                                  key={aIdx}
                                  onPress={() => setPreviewImageUrl(att.url)}
                                  activeOpacity={0.9}
                                >
                                  <Image
                                    source={{ uri: att.url }}
                                    style={styles.attachmentThumb}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ) : null
                            )}
                          </View>
                        )}

                        {!!m.text && (
                          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.otherMessageText]}>
                            {m.text}
                          </Text>
                        )}

                        <Text style={[styles.messageTimestamp, isUser ? styles.userTimestamp : styles.otherTimestamp]}>
                          {m.timestamp}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}

              {isSending && (
                <View style={[styles.messageRow, styles.userMessageRow]}>
                  <View style={[styles.messageBubble, styles.userBubble, { opacity: 0.7 }]}>
                    <Text style={styles.userMessageText}>Sending...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Selected Photo Preview Bar */}
            {selectedPhoto && (
              <View style={styles.photoPreviewBar}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoThumb} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.photoThumbName} numberOfLines={1}>{selectedPhoto.name}</Text>
                  <Text style={styles.photoThumbSub}>Photo ready to upload with message</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.removePhotoBtn}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Input Container */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrap}>
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickPhoto}
                  disabled={isSending}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={20} color="#0284c7" />
                </TouchableOpacity>

                <TextInput
                  style={styles.textInput}
                  placeholder="Type message or question..."
                  placeholderTextColor="#94a3b8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  editable={!isSending}
                />

                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!inputText.trim() && !selectedPhoto || isSending) && styles.sendBtnDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={(!inputText.trim() && !selectedPhoto) || isSending}
                  activeOpacity={0.8}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="paper-plane" size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.footerNote}>
                Sanasa General Insurance • <Text style={{ color: "#0284c7", fontWeight: "700" }}>Live Helpdesk</Text>
              </Text>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FULL SCREEN IMAGE PREVIEW MODAL                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {previewImageUrl && (
          <Modal visible={!!previewImageUrl} transparent={false} animationType="fade">
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerCloseBtn}
                onPress={() => setPreviewImageUrl(null)}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#0a192f",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSub: {
    fontSize: 11,
    color: "#93c5fd",
    fontWeight: "500",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search Bar */
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    paddingVertical: 2,
  },

  /* Category Tabs */
  categoryTabsBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 8,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 5,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  categoryTabActive: {
    borderBottomColor: "#0284c7",
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  categoryTabTextActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },

  /* Hotline Bar */
  hotlineBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  hotlinePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  hotlinePillText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "700",
  },
  emailPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  emailPillText: {
    color: "#0284c7",
    fontSize: 10.5,
    fontWeight: "600",
  },

  /* Scroll list */
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 10,
  },

  /* Recent conversation card */
  convItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  convItemCardUnread: {
    borderColor: "#93c5fd",
    backgroundColor: "#f0f9ff",
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  convAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  convAvatarFallbackText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284c7",
  },
  convItemBody: {
    flex: 1,
  },
  convItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  convItemTime: {
    fontSize: 10,
    color: "#94a3b8",
    marginLeft: 6,
  },
  convItemPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  roleTag: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284c7",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  claimTag: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plateTag: {
    fontSize: 9.5,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  convItemSnippet: {
    fontSize: 12,
    color: "#64748b",
  },
  convItemSnippetUnread: {
    color: "#0f172a",
    fontWeight: "700",
  },
  unreadCountBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadCountBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },

  /* Claim Card */
  claimCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  claimCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  claimNumberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  vehiclePlateText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  claimCardMeta: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  claimMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  claimMetaVal: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  claimActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  claimChatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  claimChatBtnPrimary: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  claimChatBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284c7",
  },

  /* Directory Card (Branches & Agents) */
  directoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  dirAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dirAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dirName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  dirSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  dirRoleBadge: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284c7",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dirActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  dirActionBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* Empty state */
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  startClaimBtn: {
    marginTop: 14,
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  startClaimBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Loading State */
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  centerText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 10,
  },

  /* ═════════════════════════════════════════════════════════════════════════ */
  /* CHAT VIEW STYLES                                                          */
  /* ═════════════════════════════════════════════════════════════════════════ */
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  chatHeaderAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  chatHeaderAvatarFallbackText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  chatHeaderMeta: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  chatHeaderRole: {
    fontSize: 10.5,
    color: "#93c5fd",
    fontWeight: "500",
  },
  chatHeaderClaimPill: {
    fontSize: 9.5,
    color: "#00ddff",
    fontWeight: "700",
    backgroundColor: "rgba(0, 221, 255, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chatHeaderAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  claimContextStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#e0f2fe",
    borderBottomWidth: 1,
    borderBottomColor: "#bae6fd",
  },
  claimContextText: {
    fontSize: 11,
    color: "#0369a1",
  },

  /* Messages */
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 2,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  senderPhotoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  senderAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  senderAvatarFallbackText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284c7",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  userBubble: {
    backgroundColor: "#0284c7",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
  },
  senderNameLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0284c7",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userMessageText: {
    color: "#ffffff",
  },
  otherMessageText: {
    color: "#0f172a",
  },
  messageTimestamp: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  otherTimestamp: {
    color: "#94a3b8",
  },
  attachmentsGrid: {
    marginBottom: 6,
  },
  attachmentThumb: {
    width: 200,
    height: 140,
    borderRadius: 10,
    backgroundColor: "#cbd5e1",
  },

  /* Photo Preview Strip */
  photoPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#cbd5e1",
  },
  photoThumbName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  photoThumbSub: {
    fontSize: 10,
    color: "#64748b",
  },
  removePhotoBtn: {
    padding: 4,
  },

  /* Input Container */
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
  },
  attachBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    maxHeight: 90,
    minHeight: 34,
    fontSize: 13,
    color: "#0f172a",
    paddingTop: 7,
    paddingBottom: 7,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 9.5,
    color: "#94a3b8",
    marginTop: 5,
    fontWeight: "500",
  },

  /* Full Screen Image Viewer Modal */
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
});
