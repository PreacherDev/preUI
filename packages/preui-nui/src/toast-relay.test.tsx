import { act, render, screen } from "@testing-library/react";
import { toast } from "@pre_scripts/preui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NuiToastRelay } from ".";

afterEach(() => {
  act(() => toast.dismiss());
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
  vi.restoreAllMocks();
});

const send = (action: string, data: unknown) =>
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { action, data } }));
  });

describe("NuiToastRelay", () => {
  it("calls the ready callback once and shows relayed notifications without close button or actions", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "pre_shops" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    render(<NuiToastRelay readyEvent="preLibNotifyReady" action="preLibNotify" />);
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://pre_shops/preLibNotifyReady", expect.anything());

    send("preLibNotify", { description: "Vehicle stored", type: "success", duration: 5000, position: "bottom-center" });
    const item = await screen.findByRole("dialog");
    expect(item).toHaveAttribute("data-type", "success");
    // A lone description is shown as the title.
    expect(screen.getByText("Vehicle stored")).toHaveAttribute("data-slot", "toast-title");
    expect(item.querySelector("[data-slot=toast-close]")).toBeNull();
    expect(item.querySelector("[data-slot=toast-action]")).toBeNull();
    expect(document.querySelector("[data-slot=toaster]")).toHaveAttribute("data-position", "bottom-center");
  });

  it("keeps title and description apart and ignores malformed messages", async () => {
    render(<NuiToastRelay />);
    send("toast", { nope: true });
    send("toast", { title: "Garage", description: "Vehicle stored" });
    expect(await screen.findByText("Garage")).toHaveAttribute("data-slot", "toast-title");
    expect(screen.getByText("Vehicle stored")).toHaveAttribute("data-slot", "toast-description");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(document.querySelector("[data-slot=toaster]")).toHaveAttribute("data-position", "top-right");
  });
});
