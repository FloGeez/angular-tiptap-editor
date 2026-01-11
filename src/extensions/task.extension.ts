import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

export const CustomTaskList = TaskList.configure({
    HTMLAttributes: {
        class: 'custom-task-list',
    },
});

export const CustomTaskItem = TaskItem.extend({
    content: 'inline*',
}).configure({
    HTMLAttributes: {
        class: 'custom-task-item',
    },
});

// For backward compatibility with existing imports in main.ts
export { CustomTaskList as TaskList, CustomTaskItem as TaskItem };
