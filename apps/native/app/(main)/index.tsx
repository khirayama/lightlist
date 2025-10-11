import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { store } from '@lightlist/sdk';
import { api } from '../../src/lib/api';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
}

interface TaskListDoc {
  id: string;
  name: string;
  background: string;
  tasks: Task[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  doc?: string;
}

export default function Main() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [taskLists, setTaskLists] = useState<TaskListDoc[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskListName, setNewTaskListName] = useState('');
  const [newTaskListBackground, setNewTaskListBackground] = useState('#007bff');
  const [newTaskText, setNewTaskText] = useState('');
  const [taskInsertPosition, setTaskInsertPosition] = useState<
    'top' | 'bottom'
  >('top');
  const [autoSort, setAutoSort] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<Task | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  // polling is handled by SDK store
  useEffect(() => {
    store.startPolling();
    return () => store.stopPolling();
  }, []);
  useEffect(() => {
    store.configure({ getToken: api.getToken });
    const unsub = store.subscribe(s => {
      if (s.settings) {
        setTaskInsertPosition(s.settings.taskInsertPosition);
        setAutoSort(s.settings.autoSort);
      }
      setTaskLists(s.taskLists as any);
    });
    if (!store.get().settings || store.get().taskLists.length === 0) {
      store.init().catch(err => console.error('sdk init failed', err));
    }
    return unsub;
  }, []);

  // autoSortに基づく目標順へCRDTを移動（必要時のみ）

  const handleCreateTaskList = async () => {
    if (!newTaskListName.trim()) return;
    try {
      setSyncing(true);
      const res = await store.createTaskListDoc(
        newTaskListName,
        newTaskListBackground
      );
      setShowCreateModal(false);
      setNewTaskListName('');
      setNewTaskListBackground('#007bff');
      setSelectedTaskListId(res.id);
    } catch (error) {
      Alert.alert(
        t('taskList.error.createFailed'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenDateModal = (task: Task) => {
    setSelectedTaskForDate(task);
    setSelectedDate(task.date ? new Date(task.date) : new Date());
    setShowDateModal(true);
  };

  const handleSetTaskDate = async (date: string | null) => {
    if (!selectedTaskListId || !selectedTaskForDate) return;
    try {
      setSyncing(true);
      await store.setTaskDate(selectedTaskListId, selectedTaskForDate.id, date);
      setShowDateModal(false);
      setSelectedTaskForDate(null);
    } catch (error) {
      Alert.alert(
        t('task.error.updateFailed'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !selectedTaskListId) return;
    const list = taskLists.find(tl => tl.id === selectedTaskListId);
    if (!list) return;
    try {
      setSyncing(true);
      await store.addTask(list.id, newTaskText);
      setNewTaskText('');
    } catch (error) {
      Alert.alert(
        t('task.error.createFailed'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedTaskListId) return;
    const list = taskLists.find(tl => tl.id === selectedTaskListId);
    if (!list) return;
    try {
      setSyncing(true);
      await store.toggleTask(list.id, taskId);
    } catch (error) {
      Alert.alert(
        t('task.error.updateFailed'),
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedTaskListId) return;
    const list = taskLists.find(tl => tl.id === selectedTaskListId);
    if (!list) return;

    Alert.alert(t('task.delete'), t('task.deleteConfirm'), [
      { text: t('taskList.cancel'), style: 'cancel' },
      {
        text: t('task.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSyncing(true);
            await store.deleteTask(list.id, taskId);
          } catch (error) {
            Alert.alert(
              t('task.error.deleteFailed'),
              error instanceof Error ? error.message : String(error)
            );
          } finally {
            setSyncing(false);
          }
        },
      },
    ]);
  };

  const handleDeleteTaskList = async (taskListId: string) => {
    Alert.alert(t('taskList.delete'), t('taskList.deleteConfirm'), [
      { text: t('taskList.cancel'), style: 'cancel' },
      {
        text: t('task.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSyncing(true);
            await api.deleteTaskListDoc(taskListId);
            docsRef.current.delete(taskListId);
            setTaskLists(prev => prev.filter(tl => tl.id !== taskListId));
            if (selectedTaskListId === taskListId) setSelectedTaskListId(null);
          } catch (error) {
            Alert.alert(
              t('taskList.error.deleteFailed'),
              error instanceof Error ? error.message : String(error)
            );
          } finally {
            setSyncing(false);
          }
        },
      },
    ]);
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedTaskList = taskLists.find(tl => tl.id === selectedTaskListId);

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            {t('home.title')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(main)/settings')}
            className="rounded-lg p-2"
          >
            <Text className="text-base text-blue-500">⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        className="max-h-16 border-b border-gray-200 bg-gray-50"
        showsHorizontalScrollIndicator={false}
      >
        {taskLists.map(taskList => (
          <TouchableOpacity
            key={taskList.id}
            onPress={() => setSelectedTaskListId(taskList.id)}
            onLongPress={() => handleDeleteTaskList(taskList.id)}
            className={`mx-2 my-2 rounded-lg px-4 py-2 ${selectedTaskListId === taskList.id ? 'bg-blue-500' : 'bg-gray-200'}`}
            style={
              selectedTaskListId === taskList.id && taskList.background
                ? { backgroundColor: taskList.background }
                : {}
            }
          >
            <Text
              className={`font-semibold ${selectedTaskListId === taskList.id ? 'text-white' : 'text-gray-700'}`}
            >
              {taskList.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          className="mx-2 my-2 rounded-lg bg-green-500 px-4 py-2"
        >
          <Text className="font-semibold text-white">
            {t('home.addTaskList')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {taskLists.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="mb-4 text-gray-500">{t('home.noTaskLists')}</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-semibold text-white">
              {t('home.createFirstTaskList')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1">
          <View className="border-b border-gray-200 bg-white p-4">
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2"
                placeholder={t('home.taskPlaceholder')}
                value={newTaskText}
                onChangeText={setNewTaskText}
                onSubmitEditing={handleAddTask}
              />
              <TouchableOpacity
                onPress={handleAddTask}
                disabled={!newTaskText.trim()}
                className="ml-2 rounded-lg bg-blue-500 px-4 py-2 disabled:opacity-50"
              >
                <Text className="font-semibold text-white">
                  {t('home.addTask')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 bg-white">
            {selectedTaskList && selectedTaskList.tasks.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-500">{t('home.noTasks')}</Text>
              </View>
            ) : (
              selectedTaskList?.tasks.map(task => (
                <View
                  key={task.id}
                  className="border-b border-gray-200 px-4 py-3"
                >
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleToggleTask(task.id)}
                      className="mr-3"
                    >
                      <Text className="text-xl">
                        {task.completed ? '✅' : '⬜'}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      className={`flex-1 text-base ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                    >
                      {task.text}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOpenDateModal(task)}
                      className="ml-2"
                    >
                      <Text className="text-base text-blue-500">📅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(task.id)}
                      className="ml-2"
                    >
                      <Text className="text-base text-red-500">🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  {task.date && (
                    <Text className="ml-9 mt-1 text-sm text-gray-500">
                      📅 {task.date}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="w-11/12 max-w-md rounded-lg bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              {t('taskList.createTitle')}
            </Text>

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              {t('taskList.name')}
            </Text>
            <TextInput
              className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2"
              placeholder={t('taskList.namePlaceholder')}
              value={newTaskListName}
              onChangeText={setNewTaskListName}
            />

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              {t('taskList.background')}
            </Text>
            <View className="mb-6 flex-row flex-wrap">
              {[
                '#007bff',
                '#28a745',
                '#dc3545',
                '#ffc107',
                '#17a2b8',
                '#6f42c1',
              ].map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setNewTaskListBackground(color)}
                  className="m-1 h-12 w-12 rounded-lg"
                  style={{
                    backgroundColor: color,
                    borderWidth: newTaskListBackground === color ? 3 : 0,
                    borderColor: '#000',
                  }}
                />
              ))}
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTaskListName('');
                  setNewTaskListBackground('#007bff');
                }}
                className="mr-2 rounded-lg bg-gray-200 px-4 py-2"
              >
                <Text className="font-semibold text-gray-700">
                  {t('taskList.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateTaskList}
                disabled={!newTaskListName.trim()}
                className="rounded-lg bg-blue-500 px-4 py-2 disabled:opacity-50"
              >
                <Text className="font-semibold text-white">
                  {t('taskList.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDateModal(false);
          setSelectedTaskForDate(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="w-11/12 max-w-md rounded-lg bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              {t('task.setDate')}
            </Text>

            {selectedTaskForDate && (
              <Text className="mb-4 text-sm text-gray-600">
                {selectedTaskForDate.text}
              </Text>
            )}

            <View className="mb-4 flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => handleSetTaskDate(formatDate(new Date()))}
                className="rounded-lg bg-blue-500 px-4 py-2"
              >
                <Text className="font-semibold text-white">
                  {t('task.today')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  handleSetTaskDate(formatDate(tomorrow));
                }}
                className="rounded-lg bg-blue-500 px-4 py-2"
              >
                <Text className="font-semibold text-white">
                  {t('task.tomorrow')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSetTaskDate(null)}
                className="rounded-lg bg-gray-500 px-4 py-2"
              >
                <Text className="font-semibold text-white">
                  {t('task.clearDate')}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-sm font-semibold text-gray-700">
                {t('task.setDate')}
              </Text>
              <Text className="text-base text-gray-900">
                {formatDate(selectedDate)}
              </Text>
            </View>

            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => {
                  setShowDateModal(false);
                  setSelectedTaskForDate(null);
                }}
                className="mr-2 rounded-lg bg-gray-200 px-4 py-2"
              >
                <Text className="font-semibold text-gray-700">
                  {t('taskList.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSetTaskDate(formatDate(selectedDate))}
                className="rounded-lg bg-blue-500 px-4 py-2"
              >
                <Text className="font-semibold text-white">
                  {t('taskList.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {syncing && (
        <View className="absolute bottom-4 right-4 rounded-full bg-blue-500 px-3 py-2">
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </View>
  );
}
