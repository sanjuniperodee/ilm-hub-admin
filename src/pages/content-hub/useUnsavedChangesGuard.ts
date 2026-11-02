import { useCallback, useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { useConfirm } from '../../components/ui';

type NavFn = (...args: unknown[]) => void;

/**
 * Warns before leaving a page with unsaved changes.
 *
 * - Closing/reloading the tab: native `beforeunload` prompt.
 * - In-app navigation (links, breadcrumbs, `navigate()`): a `useConfirm` dialog.
 *   The app uses `<BrowserRouter>` (no `useBlocker`), so this wraps the router
 *   navigator's `push`/`replace` while `when` is true and restores them afterwards.
 *   Browser back/forward buttons are not intercepted.
 *
 * Call `allowNextNavigation()` right before navigating away after a successful save.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const confirm = useConfirm();
  const bypass = useRef(false);

  useEffect(() => {
    bypass.current = false;
    if (!when) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const nav = navigator as unknown as { push: NavFn; replace: NavFn };
    const originalPush = nav.push;
    const originalReplace = nav.replace;

    const guard = (original: NavFn): NavFn => (...args) => {
      if (bypass.current) {
        original.apply(nav, args);
        return;
      }
      void confirm({
        title: 'Уйти без сохранения?',
        description: 'Изменения на этой странице не сохранены и будут потеряны.',
        confirmLabel: 'Уйти без сохранения',
        cancelLabel: 'Остаться',
        destructive: true,
      }).then((ok) => {
        if (!ok) return;
        bypass.current = true;
        original.apply(nav, args);
      });
    };

    nav.push = guard(originalPush);
    nav.replace = guard(originalReplace);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      nav.push = originalPush;
      nav.replace = originalReplace;
    };
  }, [when, navigator, confirm]);

  const allowNextNavigation = useCallback(() => {
    bypass.current = true;
  }, []);

  return { allowNextNavigation };
}
