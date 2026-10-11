import React, { memo, useCallback } from "react";
import { Text, DeleteButton } from "../../ui_primitives";
import { ThreadItemProps } from "../types/thread.types";
import { formatClockTime24 } from "../../../utils/formatUtils";
import { resolveSeededChatTitle } from "../utils/threadUtils";

const ThreadItemBase: React.FC<ThreadItemProps> = ({
  threadId,
  thread,
  isSelected,
  isDeleting,
  onSelect,
  onRequestDelete,
  previewText,
  languageVersion
}) => {
  // Language anchor: the title resolves through the catalog at render time
  // (resolveSeededChatTitle); the version rides the props to bust the memo.
  void languageVersion;
  const handleSelect = useCallback(() => {
    onSelect(threadId);
  }, [threadId, onSelect]);

  const handleDeleteClick = useCallback(() => {
    onRequestDelete(threadId);
  }, [threadId, onRequestDelete]);

  return (
    <li
      className={`thread-item ${isSelected ? "selected" : ""} ${isDeleting ? "deleting" : ""}`}
    >
      <button
        type="button"
        className="thread-item-select"
        aria-current={isSelected ? "true" : undefined}
        onClick={handleSelect}
      >
        <Text component="span" className="thread-title">
          {/* A stored title that is still the creation-time seeded default
              ("New conversation") resolves through the catalog at render time
              — same guarded-default discipline as threadPreview and the tab
              bar; a user rename renders verbatim. */}
          {thread.title ? resolveSeededChatTitle(thread.title) : previewText}
        </Text>
        <Text component="span" className="thread-time">
          {formatClockTime24(thread.updatedAt)}
        </Text>
      </button>
      <DeleteButton onClick={handleDeleteClick} />
    </li>
  );
};

export const ThreadItem = memo(ThreadItemBase, (prevProps, nextProps) => {
  return (
    prevProps.threadId === nextProps.threadId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.previewText === nextProps.previewText &&
    prevProps.thread.title === nextProps.thread.title &&
    prevProps.thread.updatedAt === nextProps.thread.updatedAt &&
    // Titles localize at render time (resolveSeededChatTitle); a language
    // switch with identical thread props must still re-render the row.
    prevProps.languageVersion === nextProps.languageVersion
  );
});

export default ThreadItem;
