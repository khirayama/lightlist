import Testing
@testable import Lightlist

struct LightlistTests {

    @Test func appRoutesExposeExpectedTitles() async throws {
        #expect(AppRoute.taskLists.title == "TaskLists")
        #expect(AppRoute.taskList(taskListId: "sample").title == "TaskList")
        #expect(AppRoute.settings.title == "Settings")
    }

    @Test func initialNavigationPathStartsOnTaskList() async throws {
        #expect(AppRoute.initialPath.count == 1)
        #expect(AppRoute.initialPath.first == .taskList(taskListId: "__initial__"))
    }
}
