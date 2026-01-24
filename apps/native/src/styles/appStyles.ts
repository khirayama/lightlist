import { StyleSheet } from "react-native";
import { fonts } from "./theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  appContent: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 768,
    width: "100%",
    alignSelf: "center",
  },
  settingsContent: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 768,
    width: "100%",
    alignSelf: "center",
  },
  settingsCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  appHeader: {
    marginBottom: 16,
  },
  appTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  headerButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  headerIconButton: {
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  drawerRoot: {
    flex: 1,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  drawerOverlayPressable: {
    flex: 1,
  },
  drawerPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    padding: 20,
    gap: 16,
  },
  splitRoot: {
    flex: 1,
    flexDirection: "row",
  },
  splitSidebar: {
    width: 420,
    maxWidth: 420,
    flexShrink: 0,
    borderRightWidth: 1,
  },
  splitSidebarContent: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  splitMain: {
    flex: 1,
    minWidth: 0,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  drawerHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  drawerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  drawerNavButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  drawerNavText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  drawerList: {
    gap: 12,
    paddingBottom: 20,
  },
  drawerListItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drawerListSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  drawerListItemText: {
    flex: 1,
    gap: 4,
  },
  drawerListItemName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  drawerListItemCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  appError: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginBottom: 12,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    flex: 1,
  },
  settingsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  settingsValue: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: "center",
  },
  optionButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  taskCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  taskInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskInput: {
    flex: 1,
    fontFamily: fonts.regular,
  },
  taskItem: {
    gap: 12,
    paddingVertical: 10,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskTextButton: {
    flex: 1,
  },
  taskMetaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  taskActionButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  taskActionText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  taskActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  taskActionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskSendButton: {
    paddingHorizontal: 14,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  taskText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
  },
  taskEditInput: {
    paddingVertical: 10,
    fontFamily: fonts.regular,
  },
  taskDeleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  taskDeleteText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  taskSeparator: {
    height: 1,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  appName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    marginTop: 8,
  },
  status: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 12,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  helpText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  notice: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
  dialogOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  dialogKeyboard: {
    width: "100%",
    alignItems: "center",
  },
  dialogCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  dialogHeader: {
    gap: 6,
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  dialogDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  dialogBody: {
    gap: 16,
  },
  dialogFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  indicatorDot: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  indicatorDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
