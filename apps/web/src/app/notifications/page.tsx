"use client";

import { useEffect } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useWalletContext } from "@/components/WalletProvider";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function NotificationRow({ notification }: { notification: Notification }) {
  const actor = truncateAddress(notification.actor);
  const ts = new Date(notification.timestamp).toLocaleString();

  let message: string;
  switch (notification.type) {
    case "follow":
      message = `@${actor} started following you`;
      break;
    case "like":
      message = `@${actor} liked your post${notification.postId !== undefined ? ` #${notification.postId}` : ""}`;
      break;
    case "tip":
      message = `@${actor} tipped ${notification.amountXlm ?? "?"} XLM on post${notification.postId !== undefined ? ` #${notification.postId}` : ""}`;
      break;
  }

  return (
    <li
      className={`flex items-start gap-4 rounded-xl border px-5 py-4 transition-colors ${
        notification.read
          ? "border-[var(--border)] bg-[var(--muted)]/40"
          : "border-violet-700/50 bg-violet-900/20"
      }`}
      data-testid="notification-item"
      data-type={notification.type}
    >
      <span
        className={`mt-0.5 flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
          notification.read ? "bg-transparent" : "bg-violet-500"
        }`}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--foreground)]">{message}</p>
        <time className="text-xs text-[var(--text-muted)]" dateTime={notification.timestamp}>
          {ts}
        </time>
      </div>
    </li>
  );
}

export default function NotificationsPage() {
  const { address, connected } = useWalletContext();
  const { notifications, hasMore, unreadCount, markAllRead, loadMore } = useNotifications();

  // Reset unread badge on visit
  useEffect(() => {
    if (connected && unreadCount > 0) {
      markAllRead();
    }
  }, [connected, unreadCount, markAllRead]);

  if (!connected || !address) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">Connect your wallet to see notifications.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            data-testid="mark-all-read"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-6 py-12 text-center"
          data-testid="empty-state"
        >
          <p className="text-[var(--text-muted)]">
            No activity yet. Share your profile to get followers.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3" data-testid="notifications-list">
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </ul>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--text-muted)] hover:border-violet-500/60 hover:text-violet-400 transition-colors"
                data-testid="load-more"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
