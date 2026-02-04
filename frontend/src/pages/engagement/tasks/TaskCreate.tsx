/**
 * TaskCreate Page
 * Page for creating a new task
 */

import React from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { createTask } from '../../../store/slices/tasksSlice';
import TaskForm from '../../../components/TaskForm';
import type { CreateTaskDTO, UpdateTaskDTO } from '../../../types/task';

const TaskCreate: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleSubmit = async (taskData: CreateTaskDTO | UpdateTaskDTO) => {
    await dispatch(createTask(taskData as CreateTaskDTO)).unwrap();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
        <p className="mt-2 text-gray-600">Enter the task details below.</p>
      </div>

      <TaskForm onSubmit={handleSubmit} />
    </div>
  );
};

export default TaskCreate;
