import { Link as TanStackLink, useNavigate } from "@tanstack/react-router";
import { Anchor, AnchorProps } from "@mantine/core";

type LinkProps = Omit<AnchorProps, "component"> & {
  to: string;
  children: React.ReactNode;
};

export function Link({ to, children, ...props }: LinkProps) {
  const navigate = useNavigate();

  return (
    <Anchor component={TanStackLink} to={to} {...props}>
      {children}
    </Anchor>
  );
}
