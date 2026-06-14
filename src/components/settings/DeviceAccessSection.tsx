"use client";

import { getDeviceLimitForUser, getRegisteredDevices } from "@/lib/auth/device-access";
import type { AuthSession } from "@/types/auth";

export function DeviceAccessSection({ session }: { session: AuthSession }) {
  const devices = getRegisteredDevices(session.user.id);
  const limit = getDeviceLimitForUser(session.user);

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="devices"
    >
      <div className="org-settings-group-title">Devices &amp; login</div>
      <p className="org-settings-brand-help">
        {limit == null
          ? "Administrator accounts are not limited by device count."
          : `Your plan allows up to ${limit} signed-in device(s) at once.`}
      </p>

      {limit != null ? (
        <p className="org-settings-hint">
          {devices.length} / {limit} registered on this account.
        </p>
      ) : null}

      <ul className="org-settings-device-list">
        {devices.length === 0 ? (
          <li className="org-settings-hint">No devices registered yet.</li>
        ) : (
          devices.map((device) => (
            <li key={device.id} className="org-settings-device-item">
              <strong>{device.label}</strong>
              <span>
                Last seen{" "}
                {new Date(device.lastSeenAt).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
