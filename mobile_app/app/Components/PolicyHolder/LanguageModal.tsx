import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../../utils/translations";

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageModal({ visible, onClose }: LanguageModalProps) {
  const { lang, changeLang } = useLanguage();

  const options: { code: "en" | "si" | "ta"; label: string; subLabel: string; flag: string }[] = [
    { code: "en", label: "English", subLabel: "Default Language", flag: "🇬🇧" },
    { code: "si", label: "සිංහල", subLabel: "Sinhala", flag: "🇱🇰" },
    { code: "ta", label: "தமிழ்", subLabel: "Tamil", flag: "🇱🇰" },
  ];

  const handleSelect = async (code: "en" | "si" | "ta") => {
    await changeLang(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="language" size={20} color="#0284c7" />
              <Text style={styles.title}>Select Language / භාෂාව / மொழி</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt) => {
              const isSelected = lang === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                  onPress={() => handleSelect(opt.code)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.flag}>{opt.flag}</Text>
                    <View>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.optionSub}>{opt.subLabel}</Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 380,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  optionItemSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flag: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  optionLabelSelected: {
    color: "#0369a1",
  },
  optionSub: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
});
