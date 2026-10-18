import { configured, currentProfile, supabase } from "./supabase.js";
import { hasSessionHint } from "./session-hint.js";
import { profileAvatar } from "./profile-options.mjs";

let initialized = false;

export function initializeMemberCta() {
    if (initialized) return;
    initialized = true;

    const account = document.querySelector("[data-mobile-account]");
    const guests = [...document.querySelectorAll("[data-mobile-guest]")];
    const homeButtons = [...document.querySelectorAll("[data-home-cta]")];
    const mobileViewport = matchMedia("(max-width: 900px)");
    let accountSignedIn = false;
    const buttons = [...document.querySelectorAll("[data-member-cta]")].map(button => ({
        button,
        label: button.querySelector("[data-cta-label]") || button,
        text: (button.querySelector("[data-cta-label]") || button).textContent,
        href: button.getAttribute("href"),
        original: button.getAttribute("data-original"),
    }));
    let revision = 0;

    function renderMembership(approved) {
        for (const { button, label, text, href, original } of buttons) {
            button.setAttribute("href", approved ? "/account" : href);
            label.textContent = approved ? "ACCOUNT" : text;
            if (approved) button.dataset.original = "ACCOUNT";
            else if (original !== null) button.dataset.original = original;
            else button.removeAttribute("data-original");
        }
    }

    function renderAccount(signedIn) {
        accountSignedIn = signedIn;
        if (account) account.hidden = !signedIn;
        guests.forEach(link => { link.hidden = signedIn; });
        renderHomeButton();
    }

    function renderHomeButton() {
        const showProjects = !mobileViewport.matches || accountSignedIn;
        homeButtons.forEach(link => {
            link.hidden = (link.dataset.homeCta === "member") !== showProjects;
        });
    }
    if (homeButtons.length) mobileViewport.addEventListener("change", renderHomeButton);

    function renderAvatar(profile = {}) {
        if (!account) return;
        const { emoji, label } = profileAvatar(profile);
        const picture = document.createElement("span");
        picture.className = "header-profile-avatar";
        picture.setAttribute("role", "img");
        picture.setAttribute("aria-label", label);
        picture.textContent = emoji;
        account.replaceChildren(picture);
    }

    function renderSession(session) {
        const version = ++revision;
        const signedIn = Boolean(session?.user);
        renderAccount(signedIn);
        renderMembership(false);
        if (!signedIn) return;
        const metadata = session.user.user_metadata || {};
        renderAvatar({ avatar: metadata.avatar, pronouns: metadata.pronouns });

        // Every signed-in user can access Account; approval still controls
        // the desktop membership CTA and protected member features.
        // Defer Supabase calls outside the auth callback to avoid its lock.
        setTimeout(() => {
            if (version !== revision) return;
            currentProfile().then(profile => {
                if (version !== revision) return;
                renderMembership(profile?.status === "approved");
                if (profile) renderAvatar(profile);
            }).catch(error => console.error("Member CTA status could not be refreshed:", error.message));
        }, 0);
    }

    // Keep the shortcut available while a saved session refreshes, including
    // on a slow mobile connection. This hint grants no access: /account and
    // protected features still verify the session and membership normally.
    renderAccount(configured && hasSessionHint());
    renderAvatar();
    renderMembership(false);
    if (!configured || !supabase) return;
    supabase.auth.onAuthStateChange((_event, session) => renderSession(session));
    const version = revision;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) throw error;
        if (version === revision) renderSession(session);
    }).catch(error => console.error("Member session could not be loaded:", error.message));
}
