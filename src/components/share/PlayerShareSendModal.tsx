"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getTeamRoster,
  normalizeWhatsAppPhone,
  playerRosterContactMeta,
  playerRosterDisplayName,
} from "@/lib/players/player-roster";
import {
  buildBccEmailShareLink,
  buildCopyMessagesBlock,
  buildEmailShareLink,
  buildWhatsAppShareLink,
  getDefaultPlayerShareMessage,
} from "@/lib/players/player-share-messages";
import { useShareStore } from "@/stores/share-store";
import { appCopyLink, appNotice } from "@/stores/dialog-store";
import type { PlayerRosterEntry } from "@/types/player-roster";
import "@/styles/player-share.css";

export function PlayerShareSendModal() {
  const open = useShareStore((s) => s.sendModalOpen);
  const context = useShareStore((s) => s.sendContext);
  const rosterModalOpen = useShareStore((s) => s.rosterModalOpen);
  const closeSendModal = useShareStore((s) => s.closeSendModal);
  const openRosterModal = useShareStore((s) => s.openRosterModal);

  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [players, setPlayers] = useState<PlayerRosterEntry[]>([]);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function resizeMessageBox() {
    const el = messageRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !context) return;
    const roster = getTeamRoster(context.team);
    setPlayers(roster.players);
    setSelectedIds(new Set(roster.players.map((p) => p.id)));
    setMessage(getDefaultPlayerShareMessage(context.contentName));
  }, [open, context]);

  useEffect(() => {
    if (!open || !context || rosterModalOpen) return;
    const roster = getTeamRoster(context.team);
    setPlayers(roster.players);
    setSelectedIds((prev) => {
      const valid = new Set(roster.players.map((p) => p.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (!next.size) roster.players.forEach((p) => next.add(p.id));
      return next;
    });
  }, [open, context, rosterModalOpen]);

  useEffect(() => {
    if (!open) return;
    resizeMessageBox();
  }, [open, message]);

  const selected = useMemo(
    () => players.filter((p) => selectedIds.has(p.id)),
    [players, selectedIds],
  );

  function togglePlayer(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(players.map((p) => p.id)) : new Set(),
    );
  }

  async function copyLink() {
    if (!context?.url) return;
    try {
      await navigator.clipboard.writeText(context.url);
      appNotice("Link copied", "Link copied.");
    } catch {
      appCopyLink("Copy link", context.url);
    }
  }

  async function copyMessages() {
    if (!context?.url) return;
    const withContact = selected.filter(
      (p) => String(p.email || "").trim() || normalizeWhatsAppPhone(p.phone || ""),
    );
    if (!withContact.length) {
      appNotice("Select players", "Select at least one player.");
      return;
    }
    const block = buildCopyMessagesBlock(withContact, message, context.url);
    try {
      await navigator.clipboard.writeText(block);
      appNotice("Messages copied", `Copied ${withContact.length} message(s).`);
    } catch {
      appCopyLink("Copy messages", block);
    }
  }

  function emailSelected() {
    if (!context?.url) return;
    const withEmail = selected.filter((p) => String(p.email || "").trim());
    if (!withEmail.length) {
      appNotice("Email required", "Select players with email addresses.");
      return;
    }
    const subject = `${context.contentName} — FastCourt`;
    const usesName = message.includes("{name}");
    if (usesName && withEmail.length > 1) {
      window.location.href = buildEmailShareLink(
        withEmail[0],
        subject,
        message,
        context.url,
      );
      appNotice(
        "Email opened",
        `Opened email for ${withEmail[0].name}. Use row Email buttons or Copy messages for the rest.`,
      );
      return;
    }
    window.location.href = buildBccEmailShareLink(
      withEmail,
      subject,
      message,
      context.url,
    );
  }

  function emailPlayer(player: PlayerRosterEntry) {
    if (!context?.url || !player.email) return;
    const subject = `${context.contentName} — FastCourt`;
    window.location.href = buildEmailShareLink(
      player,
      subject,
      message,
      context.url,
    );
  }

  function whatsAppPlayer(player: PlayerRosterEntry) {
    if (!context?.url) return;
    const link = buildWhatsAppShareLink(player, message, context.url);
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  }

  if (!open || !mounted || !context) return null;

  const contentLabel =
    context.contentType === "practice"
      ? "practice plan"
      : context.contentType === "playbook"
        ? "playbook"
        : context.contentType === "drill"
          ? "drill"
          : "play";

  return createPortal(
    <div
      id="player-share-send-modal"
      className="active"
      role="presentation"
      onClick={closeSendModal}
    >
      <div
        className="modal-box player-share-send-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-share-send-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-box-inner">
          <div className="player-roster-hero">
            <div className="player-roster-hero-icon" aria-hidden="true">
              📤
            </div>
            <div>
              <h2 className="modal-title" id="player-share-send-title">
                Send to players
              </h2>
              <p className="modal-subtitle" id="player-share-send-subtitle">
                <strong>{context.contentName}</strong> · {context.team} ·{" "}
                {contentLabel}. Anyone with the link can view — no login.
              </p>
            </div>
          </div>
          <div className="modal-field">
            <label>Share link</label>
            <input
              type="text"
              id="player-share-send-url"
              readOnly
              value={context.url}
            />
          </div>
          <div className="player-share-send-toolbar">
          <span className="player-share-send-count" id="player-share-send-count">
            {selected.length} selected
          </span>
          <button
            type="button"
            className="modal-cancel player-share-send-select-btn"
            id="btn-player-share-select-all"
            onClick={() => selectAll(true)}
          >
            Select all
          </button>
          <button
            type="button"
            className="modal-cancel player-share-send-select-btn"
            id="btn-player-share-select-none"
            onClick={() => selectAll(false)}
          >
            Clear
          </button>
          <button
            type="button"
            className="modal-cancel player-share-send-select-btn"
            id="btn-player-share-open-roster"
            onClick={() => openRosterModal(context.team)}
          >
            Roster
          </button>
        </div>
        <div className="player-share-send-list" id="player-share-send-list">
          {!players.length ? (
            <p className="player-share-send-empty">
              No roster for this team yet. Use <b>Roster</b> to add players,
              then come back to share.
            </p>
          ) : (
            players.map((player) => {
              const hasEmail = !!String(player.email || "").trim();
              const hasPhone = !!normalizeWhatsAppPhone(player.phone || "");
              return (
                <label key={player.id} className="player-share-send-item">
                  <input
                    type="checkbox"
                    data-player-id={player.id}
                    checked={selectedIds.has(player.id)}
                    onChange={(e) => togglePlayer(player.id, e.target.checked)}
                  />
                  <div className="player-share-send-item-main">
                    <div className="player-share-send-item-name">
                      {playerRosterDisplayName(player)}
                    </div>
                    <div className="player-share-send-item-meta">
                      {playerRosterContactMeta(player)}
                    </div>
                  </div>
                  <div className="player-share-send-item-actions">
                    {hasEmail ? (
                      <button
                        type="button"
                        className="modal-cancel player-share-row-email"
                        onClick={(e) => {
                          e.preventDefault();
                          emailPlayer(player);
                        }}
                      >
                        Email
                      </button>
                    ) : null}
                    {hasPhone ? (
                      <button
                        type="button"
                        className="modal-cancel player-share-row-wa"
                        onClick={(e) => {
                          e.preventDefault();
                          whatsAppPlayer(player);
                        }}
                      >
                        WhatsApp
                      </button>
                    ) : null}
                  </div>
                </label>
              );
            })
          )}
        </div>
          <div className="modal-field">
            <label htmlFor="player-share-send-message">Message</label>
            <textarea
              ref={messageRef}
              id="player-share-send-message"
              className="player-share-send-message"
              rows={3}
              placeholder="Hi {name}, here is our content: {link}"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="modal-hint">
              Use <code>{"{name}"}</code> and <code>{"{link}"}</code> for
              personalization.
            </p>
          </div>
        </div>
        <div className="modal-actions player-share-send-actions">
          <button
            type="button"
            className="modal-cancel"
            id="player-share-send-close"
            onClick={closeSendModal}
          >
            Close
          </button>
          <button
            type="button"
            className="modal-cancel"
            id="btn-player-share-copy-link"
            onClick={() => void copyLink()}
          >
            Copy link
          </button>
          <button
            type="button"
            className="modal-cancel"
            id="btn-player-share-copy-messages"
            onClick={() => void copyMessages()}
          >
            Copy messages
          </button>
          <button
            type="button"
            className="modal-create"
            id="btn-player-share-email-selected"
            onClick={emailSelected}
          >
            Email selected
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
