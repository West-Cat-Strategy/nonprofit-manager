/**
 * Operations Board - HARD-CODED NEO-BRUTALIST STYLING
 * Kanban layout with thick black borders and hard shadows
 */

import React from 'react';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import { mockTasks } from '../../utils/mockData';

export default function OperationsBoard() {
    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'hr':
                return 'bg-[#D8BFD8] text-black border-black'; // Purple
            case 'admin':
                return 'bg-[#4DD0E1] text-black border-black'; // Cyan
            case 'finance':
                return 'bg-[#FFD700] text-black border-black'; // Yellow
            case 'tech':
                return 'bg-[#90EE90] text-black border-black'; // Green
            default:
                return 'bg-gray-300 text-black border-black';
        }
    };

    const todoTasks = mockTasks.filter(t => t.status === 'todo');
    const inProgressTasks = mockTasks.filter(t => t.status === 'in-progress');
    const doneTasks = mockTasks.filter(t => t.status === 'done');

    const TaskCard = ({ task }: { task: typeof mockTasks[0] }) => (
        <div className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-4 mb-3">
            <div className="mb-2">
                <span className={`text-xs font-bold uppercase px-2 py-1 border-2 ${getCategoryColor(task.category)}`}>
                    {task.category}
                </span>
            </div>
            <h3 className="font-bold mb-2">{task.title}</h3>
            {task.dueDate && (
                <p className="text-sm text-gray-600 mb-2">{task.dueDate}</p>
            )}
            {task.assignees && task.assignees.length > 0 && (
                <div className="flex gap-2">
                    {task.assignees.map((assignee, idx) => (
                        <div key={idx} className="w-8 h-8 bg-gray-300 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">
                            {assignee[0]}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const Column = ({
        title,
        count,
        tasks
    }: {
        title: string;
        count: number;
        tasks: typeof mockTasks;
    }) => (
        <div className="flex flex-col">
            <div className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-4 mb-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-black text-lg uppercase">{title}</h2>
                    <div className="bg-black text-white w-8 h-8 border-2 border-black rounded-full flex items-center justify-center font-bold text-sm">
                        {count}
                    </div>
                </div>
            </div>
            <div className="flex-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 min-h-[400px]">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    );

    return (
        <NeoBrutalistLayout pageTitle="Operations Board">
            <div className="p-6">
                {/* Filter/Sort Buttons */}
                <div className="mb-6 flex justify-end gap-4">
                    <button className="px-6 py-2 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 font-bold uppercase">
                        FILTER
                    </button>
                    <button className="px-6 py-2 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 font-bold uppercase">
                        SORT
                    </button>
                </div>

                {/* Kanban Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Column title="TO DO" count={todoTasks.length} tasks={todoTasks} />
                    <Column title="IN PROGRESS" count={inProgressTasks.length} tasks={inProgressTasks} />
                    <Column title="DONE" count={doneTasks.length} tasks={doneTasks} />
                </div>
            </div>
        </NeoBrutalistLayout>
    );
}
