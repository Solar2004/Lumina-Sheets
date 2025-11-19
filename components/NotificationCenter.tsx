import React, { useEffect, useState } from 'react';
import { Bell, X, User, FileSpreadsheet, MessageSquare, TrendingUp } from 'lucide-react';

export interface Notification {
    id: string;
    type: 'data' | 'chat' | 'user' | 'chart';
    user: string;
    message: string;
    timestamp: number;
}

interface NotificationCenterProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
    onClearAll: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onDismiss, onClearAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.length;

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'data':
                return <FileSpreadsheet size={16} className="text-blue-400" />;
            case 'chat':
                return <MessageSquare size={16} className="text-green-400" />;
            case 'user':
                return <User size={16} className="text-purple-400" />;
            case 'chart':
                return <TrendingUp size={16} className="text-orange-400" />;
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                title="Notifications"
            >
                <Bell size={20} className="text-gray-400" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-12 w-80 bg-[#202124] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 flex flex-col animate-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-gray-400" />
                                <h3 className="text-sm font-bold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="text-xs text-gray-400">({unreadCount})</span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={onClearAll}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Bell size={32} className="text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="p-3 border-b border-gray-700 hover:bg-gray-700/30 transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white mb-1">
                                                    <span className="font-semibold text-blue-400">{notification.user}</span>
                                                    {' '}{notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500">{formatTimestamp(notification.timestamp)}</p>
                                            </div>
                                            <button
                                                onClick={() => onDismiss(notification.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-600 rounded"
                                            >
                                                <X size={14} className="text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
