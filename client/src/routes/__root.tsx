import {
  AppShell,
  AppShellHeader,
  AppShellNavbar,
  AppShellMain,
  Burger,
  Group,
  NavLink,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect, useRef } from 'react'
import { useElementScrollRestoration } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [opened, { toggle, close }] = useDisclosure()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null);

  useElementScrollRestoration({
    getElement: () => scrollRef.current,
    id: 'main',
  });

  useEffect(() => {
    close()
  }, [location.pathname]) // Close sidebar on route change (for mobile)

  return (
    <AppShell
      navbar={{
        width: 200,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      header={{ height: 60 }}
      padding="md"
      ref={scrollRef}
    >
      <AppShellHeader withBorder>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <strong>App</strong>
        </Group>
      </AppShellHeader>

      <AppShellNavbar p="md">
        <NavLink label="Items" component={Link} to="/items" activeProps={{ className: 'mantine-active' }} />
        <NavLink
          label="Info"
          component={Link}
          to="/info"
          activeProps={{ className: 'mantine-active' }}
          activeOptions={{ exact: true }}
        />
      </AppShellNavbar>

      <AppShellMain id="mantine-app-shell-main">
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
      </AppShellMain>
    </AppShell>
  )
}
