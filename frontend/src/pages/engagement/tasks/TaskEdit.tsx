/**
 * TaskEdit Page
 * Page for editing an existing task
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchTaskById, updateTask } from '../../../store/slices/tasksSlice';
import TaskForm from '../../../components/TaskForm';
import type { UpdateTaskDTO } from '../../../types/task';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const TaskEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedTask, loading, error } = useAppSelector((state) => state.tasks);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
    }
  }, [id, dispatch]);

  const handleSubmit = async (taskData: UpdateTaskDTO) => {
    if (!id) return;
    await dispatch(updateTask({ id, updates: taskData })).unwrap();
  };

  if (loading) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (!selectedTask) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">
            Task not found
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="TASKS">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Task</h1>
          <p className="mt-2 text-gray-600">
            {selectedTask.subject}
          </p>
        </div>

        <TaskForm task={selectedTask} onSubmit={handleSubmit} isEdit />
      </div>
    </NeoBrutalistLayout>
  );
};

export default TaskEdit;
