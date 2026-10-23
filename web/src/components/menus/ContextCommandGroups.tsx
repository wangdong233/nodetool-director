/**
 * The commands the active view registered with `useContextCommands`, listed
 * right after the open tabs. Registrations that share a heading render as one
 * group, so a surface and a pane inside it can both add "Script" commands.
 *
 * `headingKey` and each command's `labelKey` resolve HERE, at render time —
 * the stored catalog keeps the English label as its default value.
 */
import { memo, useMemo } from "react";
import { Command } from "cmdk";
import { useTranslation } from "react-i18next";

import {
  runCommandAndClose,
  useCommandMenuStore,
  type ContextCommand
} from "../../stores/CommandMenuStore";

interface MergedGroup {
  heading: string;
  headingKey?: string;
  items: { key: string; command: ContextCommand }[];
}

const ContextCommandGroups = () => {
  const { t } = useTranslation();
  const groups = useCommandMenuStore((state) => state.contextGroups);

  const merged = useMemo(() => {
    const byHeading = new Map<string, MergedGroup>();
    for (const group of groups) {
      let entry = byHeading.get(group.heading);
      if (!entry) {
        entry = { heading: group.heading, headingKey: group.headingKey, items: [] };
        byHeading.set(group.heading, entry);
      }
      for (const command of group.commands) {
        entry.items.push({ key: `${group.id}:${command.id}`, command });
      }
    }
    return [...byHeading.values()];
  }, [groups]);

  return (
    <>
      {merged.map((group) => {
        const heading = group.headingKey
          ? t(group.headingKey, { defaultValue: group.heading })
          : group.heading;
        return (
          <Command.Group key={group.heading} heading={heading}>
            {group.items.map(({ key, command }) => {
              const label = command.labelKey
                ? t(command.labelKey, { defaultValue: command.label })
                : command.label;
              return (
                <Command.Item
                  key={key}
                  value={`${heading} ${label} ${key}`}
                  keywords={command.keywords}
                  onSelect={() => runCommandAndClose(command.run)}
                >
                  {label}
                  {command.shortcut && (
                    <span className="command-menu-shortcut">{command.shortcut}</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        );
      })}
    </>
  );
};

export default memo(ContextCommandGroups);
