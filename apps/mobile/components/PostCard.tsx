import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export interface Post {
  id: number | string;
  author: string;
  username: string;
  content: string;
  tip_total: number;
  timestamp: number;
  like_count: number;
}

interface FeedPostCardProps {
  post: Post;
  onPress?: () => void;
}

interface LegacyPostCardProps {
  id: number | string;
  author: string;
  content: string;
  timestamp: string | number;
  likes?: number;
  isLoading?: boolean;
  onPress?: () => void;
}

type PostCardProps = FeedPostCardProps | LegacyPostCardProps;

function formatTimestamp(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizePost(props: PostCardProps): { post: Post; timeLabel?: string } {
  if ("post" in props) {
    return { post: props.post };
  }

  return {
    post: {
      id: props.id,
      author: props.author,
      username: props.author,
      content: props.content,
      tip_total: 0,
      timestamp: typeof props.timestamp === "number" ? props.timestamp : 0,
      like_count: props.likes ?? 0,
    },
    timeLabel: typeof props.timestamp === "string" ? props.timestamp : undefined,
  };
}

export function PostCard(props: PostCardProps) {
  const router = useRouter();
  const { post, timeLabel } = normalizePost(props);
  const onPress =
    props.onPress ?? (() => router.push(`/post/${post.id}` as Parameters<typeof router.push>[0]));

  if ("isLoading" in props && props.isLoading) {
    return <PostCardSkeleton />;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${post.username}`}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.address}>{shortAddress(post.author)}</Text>
        </View>
        <Text style={styles.time}>{timeLabel ?? formatTimestamp(post.timestamp)}</Text>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <Text style={styles.stat}>♥ {post.like_count}</Text>
        <Text style={styles.stat}>◎ {post.tip_total}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function PostCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.header}>
        <View style={[styles.avatar, styles.skeletonBlock]} />
        <View style={styles.meta}>
          <View style={[styles.skeletonLine, { width: 100 }]} />
          <View style={[styles.skeletonLine, { width: 70, marginTop: 4 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: "100%", marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { width: "80%", marginTop: 6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  skeleton: {
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  meta: {
    flex: 1,
  },
  username: {
    color: "#f1f5f9",
    fontWeight: "600",
    fontSize: 14,
  },
  address: {
    color: "#64748b",
    fontSize: 11,
    fontFamily: "monospace",
  },
  time: {
    color: "#64748b",
    fontSize: 11,
  },
  content: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 16,
  },
  stat: {
    color: "#64748b",
    fontSize: 12,
  },
  skeletonBlock: {
    backgroundColor: "#334155",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#334155",
  },
});
