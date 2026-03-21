import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import type { ReportPayload, HistoryEntry } from "./buildReportPayload";

// ── Register a clean font (Helvetica is built-in) ──
// @react-pdf/renderer ships with Helvetica by default

const colors = {
    primary: "#2D3A1E",
    secondary: "#4A6741",
    accent: "#6B8F5E",
    text: "#1A1A1A",
    textLight: "#555555",
    textMuted: "#888888",
    border: "#D4D4D4",
    bgLight: "#F8F7F4",
    bgAccent: "#EEF2E6",
    white: "#FFFFFF",
    red: "#DC2626",
    orange: "#EA580C",
    blue: "#2563EB",
};

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        color: colors.text,
        paddingTop: 0,
        paddingBottom: 40,
        paddingHorizontal: 0,
    },
    // ── Slot 1: Hospital Header ──
    header: {
        backgroundColor: colors.primary,
        color: colors.white,
        paddingHorizontal: 36,
        paddingVertical: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    hospitalName: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: colors.white,
    },
    hospitalSub: {
        fontSize: 8,
        color: "#B8C9A3",
        marginTop: 2,
    },
    headerRight: {
        textAlign: "right",
    },
    headerLabel: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: colors.white,
    },
    headerMeta: {
        fontSize: 8,
        color: "#B8C9A3",
        marginTop: 1,
    },

    // ── Slot 2 + 3: Patient & Doctor Row ──
    infoRow: {
        flexDirection: "row",
        paddingHorizontal: 36,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    infoCol: {
        flex: 1,
    },
    infoColRight: {
        flex: 1,
        textAlign: "right",
    },
    sectionLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoName: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: colors.text,
    },
    infoDetail: {
        fontSize: 8,
        color: colors.textLight,
        marginTop: 1,
    },

    // ── Scan Info Bar ──
    scanBar: {
        flexDirection: "row",
        paddingHorizontal: 36,
        paddingVertical: 8,
        backgroundColor: colors.bgLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 24,
    },
    scanItem: {
        flexDirection: "row",
        gap: 4,
    },
    scanLabel: {
        fontSize: 8,
        color: colors.textMuted,
    },
    scanValue: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: colors.text,
    },

    // ── Slot 4: Case Body ──
    section: {
        paddingHorizontal: 36,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 6,
    },
    diagnosisText: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: colors.primary,
    },
    bodyText: {
        fontSize: 9,
        lineHeight: 1.5,
        color: colors.text,
    },
    severityBadge: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: colors.white,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        alignSelf: "flex-start",
        marginTop: 4,
    },

    // ── Medications Table ──
    table: {
        marginTop: 6,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: colors.bgAccent,
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: "#E8E8E8",
    },
    tableCell: {
        fontSize: 8,
        color: colors.text,
    },
    tableCellHeader: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: colors.textMuted,
        textTransform: "uppercase",
    },
    col1: { width: "30%" },
    col2: { width: "20%" },
    col3: { width: "20%" },
    col4: { width: "30%" },

    // ── Slot 5: History Timeline ──
    historySection: {
        paddingHorizontal: 36,
        paddingVertical: 12,
    },
    historyItem: {
        flexDirection: "row",
        marginBottom: 4,
        gap: 8,
    },
    historyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 2,
    },
    historyDate: {
        fontSize: 7,
        color: colors.textMuted,
        width: 65,
    },
    historyLabel: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: colors.text,
    },
    historyDetail: {
        fontSize: 7,
        color: colors.textLight,
    },

    // ── Footer ──
    footer: {
        paddingHorizontal: 36,
        paddingVertical: 12,
        backgroundColor: colors.bgLight,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    disclaimer: {
        fontSize: 7,
        color: colors.textMuted,
        lineHeight: 1.4,
    },
    signatureLine: {
        marginTop: 16,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
    },
    signatureBlock: {
        textAlign: "center",
        width: 160,
    },
    signatureDash: {
        borderTopWidth: 1,
        borderTopColor: colors.text,
        marginBottom: 4,
    },
    confidential: {
        fontSize: 6,
        color: colors.textMuted,
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: 2,
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    pageNumber: {
        position: "absolute",
        fontSize: 7,
        bottom: 16,
        right: 36,
        color: colors.textMuted,
    },
});

// ── Helper ──
function formatDate(d: Date | string | null): string {
    if (!d) return "N/A";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function severityColor(severity: string): string {
    switch (severity) {
        case "critical": return colors.red;
        case "high": return colors.orange;
        default: return colors.accent;
    }
}

function historyDotColor(type: HistoryEntry["type"]): string {
    switch (type) {
        case "scan": return colors.blue;
        case "report": return colors.accent;
        case "appointment": return colors.secondary;
    }
}

function shouldShowSlot(payload: ReportPayload, slotKey: string): boolean {
    if (!payload.template?.slotConfig) return true;
    const slot = payload.template.slotConfig[slotKey];
    return slot ? slot.show !== false : true;
}

// ── Document ──

export function HospitalReportDocument({ payload }: { payload: ReportPayload }) {
    const { hospital, patient, doctor, scan, report, medications, history, template } = payload;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* ══ SLOT 1: Hospital Header ══ */}
                {shouldShowSlot(payload, "slot1_header") && (
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.hospitalName}>
                                {hospital?.name || "VaidyaVision"}
                            </Text>
                            <Text style={styles.hospitalSub}>
                                {hospital
                                    ? [hospital.address, hospital.city, hospital.state].filter(Boolean).join(", ")
                                    : "AI-Powered Medical Intelligence Platform"}
                            </Text>
                            {hospital?.phone && (
                                <Text style={styles.hospitalSub}>
                                    Tel: {hospital.phone}
                                    {hospital.email ? ` | ${hospital.email}` : ""}
                                </Text>
                            )}
                        </View>
                        <View style={styles.headerRight}>
                            <Text style={styles.headerLabel}>Medical Report</Text>
                            <Text style={styles.headerMeta}>Report #{report.id}</Text>
                            <Text style={styles.headerMeta}>{formatDate(report.createdAt)}</Text>
                        </View>
                    </View>
                )}

                {/* ══ SLOT 2 + 3: Patient & Doctor ══ */}
                {(shouldShowSlot(payload, "slot2_patient") || shouldShowSlot(payload, "slot3_doctor")) && (
                    <View style={styles.infoRow}>
                        {shouldShowSlot(payload, "slot2_patient") && (
                            <View style={styles.infoCol}>
                                <Text style={styles.sectionLabel}>Patient Information</Text>
                                <Text style={styles.infoName}>{patient.name}</Text>
                                <Text style={styles.infoDetail}>{patient.email}</Text>
                                {(patient.age || patient.gender) && (
                                    <Text style={styles.infoDetail}>
                                        {patient.age ? `Age: ${patient.age}` : ""}
                                        {patient.gender ? ` | ${patient.gender}` : ""}
                                    </Text>
                                )}
                                {patient.bloodType && (
                                    <Text style={styles.infoDetail}>Blood Type: {patient.bloodType}</Text>
                                )}
                                {patient.phone && (
                                    <Text style={styles.infoDetail}>Phone: {patient.phone}</Text>
                                )}
                            </View>
                        )}
                        {shouldShowSlot(payload, "slot3_doctor") && (
                            <View style={styles.infoColRight}>
                                <Text style={styles.sectionLabel}>Reporting Physician</Text>
                                <Text style={styles.infoName}>Dr. {doctor.name}</Text>
                                <Text style={styles.infoDetail}>{doctor.specialty}</Text>
                                <Text style={styles.infoDetail}>{doctor.degree}</Text>
                                {doctor.licenseNumber && (
                                    <Text style={styles.infoDetail}>Lic: {doctor.licenseNumber}</Text>
                                )}
                                <Text style={styles.infoDetail}>{doctor.email}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ══ Scan Info Bar ══ */}
                <View style={styles.scanBar}>
                    <View style={styles.scanItem}>
                        <Text style={styles.scanLabel}>Modality: </Text>
                        <Text style={styles.scanValue}>{scan.modality.toUpperCase()}</Text>
                    </View>
                    {scan.aiDiagnosis && (
                        <View style={styles.scanItem}>
                            <Text style={styles.scanLabel}>AI Diagnosis: </Text>
                            <Text style={styles.scanValue}>{scan.aiDiagnosis}</Text>
                        </View>
                    )}
                    {scan.aiConfidence != null && (
                        <View style={styles.scanItem}>
                            <Text style={styles.scanLabel}>Confidence: </Text>
                            <Text style={styles.scanValue}>{(scan.aiConfidence * 100).toFixed(1)}%</Text>
                        </View>
                    )}
                    <View style={styles.scanItem}>
                        <Text style={styles.scanLabel}>Severity: </Text>
                        <Text style={{ ...styles.scanValue, color: severityColor(report.severity) }}>
                            {report.severity.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* ══ SLOT 4: Case Body ══ */}
                {shouldShowSlot(payload, "slot4_case") && (
                    <>
                        {/* Diagnosis */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Diagnosis</Text>
                            <Text style={styles.diagnosisText}>{report.diagnosis}</Text>
                            <View style={[styles.severityBadge, { backgroundColor: severityColor(report.severity) }]}>
                                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>
                                    {report.severity.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Findings */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Findings</Text>
                            <Text style={styles.bodyText}>{report.findings}</Text>
                        </View>

                        {/* Recommendations */}
                        {report.recommendations && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Recommendations</Text>
                                <Text style={styles.bodyText}>{report.recommendations}</Text>
                            </View>
                        )}

                        {/* Medications Table */}
                        {medications.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Current Medications</Text>
                                <View style={styles.table}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableCellHeader, styles.col1]}>Drug</Text>
                                        <Text style={[styles.tableCellHeader, styles.col2]}>Dosage</Text>
                                        <Text style={[styles.tableCellHeader, styles.col3]}>Frequency</Text>
                                        <Text style={[styles.tableCellHeader, styles.col4]}>Instructions</Text>
                                    </View>
                                    {medications.map((med, i) => (
                                        <View key={i} style={styles.tableRow}>
                                            <Text style={[styles.tableCell, styles.col1]}>{med.drugName}</Text>
                                            <Text style={[styles.tableCell, styles.col2]}>{med.dosage || "—"}</Text>
                                            <Text style={[styles.tableCell, styles.col3]}>{med.frequency || "—"}</Text>
                                            <Text style={[styles.tableCell, styles.col4]}>{med.instructions || "—"}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* ══ SLOT 5: History Timeline ══ */}
                {shouldShowSlot(payload, "slot5_history") && history.length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>Patient History (Last 180 Days)</Text>
                        {history.map((entry, i) => (
                            <View key={i} style={styles.historyItem}>
                                <View style={[styles.historyDot, { backgroundColor: historyDotColor(entry.type) }]} />
                                <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyLabel}>{entry.label}</Text>
                                    {entry.detail && (
                                        <Text style={styles.historyDetail}>{entry.detail}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ══ Footer: Disclaimer + Signature ══ */}
                <View style={styles.footer}>
                    <Text style={styles.disclaimer}>
                        {template?.disclaimerText ||
                            "This report has been generated using AI-assisted diagnostic tools and reviewed by a qualified medical professional. Clinical correlation is advised."}
                    </Text>

                    <View style={styles.signatureLine}>
                        <View style={styles.signatureBlock}>
                            <View style={styles.signatureDash} />
                            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
                                Dr. {doctor.name}
                            </Text>
                            <Text style={{ fontSize: 7, color: colors.textLight }}>
                                {doctor.specialty} | {doctor.degree}
                            </Text>
                            {doctor.licenseNumber && (
                                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                                    Lic: {doctor.licenseNumber}
                                </Text>
                            )}
                        </View>
                    </View>

                    <Text style={styles.confidential}>
                        Confidential Medical Document — For Authorized Use Only
                    </Text>
                </View>

                {/* Page number */}
                <Text
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    fixed
                />
            </Page>
        </Document>
    );
}
