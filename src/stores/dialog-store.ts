"use client";

import { create } from "zustand";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export interface InputDialogOptions {
  title: string;
  subtitle?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  allowEmpty?: boolean;
}

export interface PlaybookNameDialogOptions {
  mode: "create" | "rename";
  initialName?: string;
  initialTeam?: string;
  teams: string[];
  existingNames: string[];
}

export type PlaybookNameDialogResult = { name: string; team: string };

interface DialogState {
  notice: { title: string; message: string } | null;
  confirmDialog: ConfirmDialogOptions | null;
  input: InputDialogOptions | null;
  copyLink: { title: string; url: string } | null;
  playbookNameDialog: PlaybookNameDialogOptions | null;
  confirmResolver: ((value: boolean) => void) | null;
  inputResolver: ((value: string | null) => void) | null;
  playbookNameResolver: ((value: PlaybookNameDialogResult | null) => void) | null;
  showNotice: (title: string, message: string) => void;
  closeNotice: () => void;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;
  prompt: (options: InputDialogOptions) => Promise<string | null>;
  resolveInput: (value: string | null) => void;
  promptPlaybookName: (
    options: PlaybookNameDialogOptions,
  ) => Promise<PlaybookNameDialogResult | null>;
  resolvePlaybookName: (value: PlaybookNameDialogResult | null) => void;
  showCopyLink: (title: string, url: string) => void;
  closeCopyLink: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  notice: null,
  confirmDialog: null,
  input: null,
  copyLink: null,
  playbookNameDialog: null,
  confirmResolver: null,
  inputResolver: null,
  playbookNameResolver: null,

  showNotice: (title, message) => set({ notice: { title, message } }),
  closeNotice: () => set({ notice: null }),

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ confirmDialog: options, confirmResolver: resolve });
    }),

  resolveConfirm: (value) => {
    get().confirmResolver?.(value);
    set({ confirmDialog: null, confirmResolver: null });
  },

  prompt: (options) =>
    new Promise<string | null>((resolve) => {
      set({ input: options, inputResolver: resolve });
    }),

  resolveInput: (value) => {
    get().inputResolver?.(value);
    set({ input: null, inputResolver: null });
  },

  promptPlaybookName: (options) =>
    new Promise<PlaybookNameDialogResult | null>((resolve) => {
      set({ playbookNameDialog: options, playbookNameResolver: resolve });
    }),

  resolvePlaybookName: (value) => {
    get().playbookNameResolver?.(value);
    set({ playbookNameDialog: null, playbookNameResolver: null });
  },

  showCopyLink: (title, url) => set({ copyLink: { title, url } }),
  closeCopyLink: () => set({ copyLink: null }),
}));

export function appNotice(title: string, message: string) {
  useDialogStore.getState().showNotice(title, message);
}

export function appConfirm(options: ConfirmDialogOptions) {
  return useDialogStore.getState().confirm(options);
}

export function appPrompt(options: InputDialogOptions) {
  return useDialogStore.getState().prompt(options);
}

export function appPlaybookName(options: PlaybookNameDialogOptions) {
  return useDialogStore.getState().promptPlaybookName(options);
}

export function appCopyLink(title: string, url: string) {
  useDialogStore.getState().showCopyLink(title, url);
}
