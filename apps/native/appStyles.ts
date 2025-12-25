import { StyleSheet } from "react-native";

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
  },
  settingsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  settingsCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
    gap: 8,
  },
  headerButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  appError: {
    fontSize: 13,
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
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  listScroll: {
    gap: 12,
  },
  taskListItem: {
    minWidth: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
  },
  taskListName: {
    fontSize: 14,
    fontWeight: "600",
  },
  taskListCount: {
    fontSize: 12,
    marginTop: 6,
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
  },
  taskInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskInput: {
    flex: 1,
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
  },
  taskActionColumn: {
    gap: 6,
    alignItems: "flex-end",
  },
  taskActionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  taskActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskActionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  taskText: {
    fontSize: 15,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
  },
  taskEditInput: {
    paddingVertical: 10,
  },
  taskDeleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  taskDeleteText: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskSeparator: {
    height: 1,
  },
  emptyText: {
    fontSize: 13,
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
    fontWeight: "600",
  },
  appName: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  status: {
    fontSize: 13,
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
    fontWeight: "600",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  notice: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
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
    fontWeight: "600",
  },
});
