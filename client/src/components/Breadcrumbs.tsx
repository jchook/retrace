import { Breadcrumbs as MantineBreadcrumbs, Text } from "@mantine/core";
import { Link } from "./Link";

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <MantineBreadcrumbs>
      {items.map((item, index) =>
        item.href ? (
          <Link key={index} to={item.href}>
            {item.title}
          </Link>
        ) : (
          <Text key={index} component="span">
            {item.title}
          </Text>
        )
      )}
    </MantineBreadcrumbs>
  );
}
