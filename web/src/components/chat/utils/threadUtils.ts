import type { Message } from "../../../stores/ApiTypes";
import { ThreadInfo } from "../types/thread.types";
import { isString } from "../../../utils/typePredicates";
import { i18n } from "../../../i18n";

/**
 * A stored chat title: a title still carrying the creation-time seeded
 * default ("New conversation" — the runtime title constant GlobalChatStore
 * and chatProtocol both write) resolves through the catalog at render time;
 * anything else — including every user rename — is the user's data and
 * renders verbatim. Same guarded-default discipline as the tab bar's
 * DOC_TAB_DEFAULTS.
 */
export const resolveSeededChatTitle = (title: string): string =>
  title === "New conversation"
    ? i18n.t("editor:ui.newConversation", { defaultValue: title })
    : title;

/** Preview text for a chat row: server-assigned title, else the opening user
 * message, else a placeholder. A title that is still the creation-time
 * seeded default ("New conversation") resolves through the catalog at render
 * time — the same guarded-default discipline the tab bar's DOC_TAB_DEFAULTS
 * applies — while a user rename renders verbatim. */
export const threadPreview = (
  title: string | null | undefined,
  messages: Message[] | undefined
): string => {
  if (title) {
    return resolveSeededChatTitle(title);
  }
  const firstUserMessage = messages?.find((msg) => msg.role === "user");
  if (!firstUserMessage) {
    return i18n.t("editor:ui.newConversation", { defaultValue: "New conversation" });
  }
  const { content } = firstUserMessage;
  let text: string;
  if (isString(content)) {
    text = content;
  } else if (Array.isArray(content) && content[0]?.type === "text") {
    // `text` can be null even on a text block — never stringify "undefined".
    text = content[0].text ?? "";
  } else {
    text = i18n.t("editor:ui.mediaMessage", { defaultValue: "[Media message]" });
  }
  if (!text) {
    return i18n.t("editor:ui.newConversation", { defaultValue: "New conversation" });
  }
  return text.length > 50 ? `${text.substring(0, 50)}...` : text;
};

export const sortThreadsByDate = (
  threads: Record<string, ThreadInfo>
): Array<[string, ThreadInfo]> => {
  return Object.entries(threads).sort((a, b) => {
    const aDateStr = a[1].updatedAt || "";
    const bDateStr = b[1].updatedAt || "";
    return bDateStr.localeCompare(aDateStr);
  });
};