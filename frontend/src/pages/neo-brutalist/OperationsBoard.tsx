/**
 * Operations Board - KANBAN MANAGEMENT
 * Uses LoopApiService, standard Loop Blue theme
 */

import { useEffect, useState } from 'react';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import LoopApiService from '../../services/LoopApiService';
import type { Task, TaskCategory } from '../../types/schema';

export default function OperationsBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
    const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'category'>('dueDate');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await LoopApiService.getTasks();
                setTasks(data);
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const handleFilter = () => setShowFilterMenu(!showFilterMenu);
    const handleSort = () => setShowSortMenu(!showSortMenu);

    const applyFilter = (category: TaskCategory | 'all') => {
        setFilterCategory(category);
        setShowFilterMenu(false);
    };

    const applySort = (field: 'dueDate' | 'title' | 'category') => {
        setSortBy(field);
        setShowSortMenu(false);
    };

    const filteredTasks = filterCategory === 'all'
        ? tasks
        : tasks.filter(t => t.category === filterCategory);

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        // Sort by due date, tasks without dates go last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'hr':
                return 'bg-[var(--loop-purple)] text-black border-black';
            case 'admin':
                return 'bg-[var(--loop-cyan)] text-black border-black';
            case 'finance':
                return 'bg-[var(--loop-yellow)] text-black border-black';
            case 'tech':
                return 'bg-[var(--loop-green)] text-black border-black';
            default:
                return 'bg-app-hover text-black border-black';
        }
    };

    const todoTasks = sortedTasks.filter(t => t.status === 'todo');
    const inProgressTasks = sortedTasks.filter(t => t.status === 'in-progress');
    const doneTasks = sortedTasks.filter(t => t.status === 'done');

    const TaskCard = ({ task }: { task: Task }) => (
        <div className="bg-[var(--loop-blue)] border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] p-4 mb-3">
            <div className="mb-2">
                <span className={`text-xs font-bold uppercase px-2 py-1 border-2 ${getCategoryColor(task.category)}`}>
                    {task.category}
                </span>
            </div>
            <h3 className="font-bold mb-2 text-black">{task.title}</h3>
            {task.dueDate && (
                <p className="text-sm text-black/80 mb-2">{task.dueDate}</p>
            )}
            {task.assignees && task.assignees.length > 0 && (
                <div className="flex gap-2">
                    {task.assignees.map((assignee, idx) => (
                        <div key={idx} className="w-8 h-8 bg-app-hover border-2 border-black rounded-full flex items-center justify-center text-xs font-bold text-black">
                            {assignee[0]}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const Column = ({ title, count, tasks }: { title: string; count: number; tasks: Task[] }) => (
        <div className="flex flex-col">
            <div className="bg-app-surface dark:bg-[#121212] border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_var(--shadow-color)] p-4 mb-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-black text-lg uppercase text-black dark:text-white">{title}</h2>
                    <div className="bg-black text-white dark:bg-app-surface dark:text-black w-8 h-8 border-2 border-black dark:border-white rounded-full flex items-center justify-center font-bold text-sm">
                        {count}
                    </div>
                </div>
            </div>
            <div className="flex-1 bg-app-surface dark:bg-[#121212] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4 min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                    ))
                )}
            </div>
        </div>
    );

    return (
        <NeoBrutalistLayout pageTitle="OPERATIONS">
            <div className="p-6">
                {/* Banner - BLUE */}
                <div className="bg-[var(--loop-blue)] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_var(--shadow-color)] p-8 mb-6">
                    <h2 className="text-3xl font-black mb-2 uppercase">OPERATIONS</h2>
                </div>
                {/* Filter/Sort Buttons */}
                <div className="mb-6 flex justify-end gap-4 relative">
                    <div className="relative">
                        <button
                            onClick={handleFilter}
                            className="px-6 py-2 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase"
                        >
                            FILTER{filterCategory !== 'all' ? ` (${filterCategory.toUpperCase()})` : ''}
                        </button>
                        {showFilterMenu && (
                            <div className="absolute top-full mt-1 right-0 z-10 bg-app-surface border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] min-w-[160px]">
                                {(['all', 'hr', 'admin', 'finance', 'tech'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => applyFilter(cat)}
                                        className={`block w-full text-left px-4 py-2 font-bold uppercase hover:bg-app-hover border-b border-black last:border-b-0 ${filterCategory === cat ? 'bg-[var(--loop-blue)]' : ''}`}
                                    >
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={handleSort}
                            className="px-6 py-2 bg-app-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:bg-app-surface-muted font-bold uppercase"
                        >
                            SORT
                        </button>
                        {showSortMenu && (
                            <div className="absolute top-full mt-1 right-0 z-10 bg-app-surface border-2 border-black shadow-[4px_4px_0px_0px_var(--shadow-color)] min-w-[160px]">
                                {([['dueDate', 'Due Date'], ['title', 'Title'], ['category', 'Category']] as const).map(([field, label]) => (
                                    <button
                                        key={field}
                                        onClick={() => applySort(field)}
                                        className={`block w-full text-left px-4 py-2 font-bold uppercase hover:bg-app-hover border-b border-black last:border-b-0 ${sortBy === field ? 'bg-[var(--loop-blue)]' : ''}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
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
