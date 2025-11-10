import { Title, Text, List, ListItem, Code, Blockquote, Divider, Anchor } from '@mantine/core';
import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
      components={{
        // Headings
        h1: ({node, ...props}) => <Title order={1} mb="md" {...props} />,
        h2: ({node, ...props}) => <Title order={2} mb="md" {...props} />,
        h3: ({node, ...props}) => <Title order={3} mb="md" {...props} />,
        h4: ({node, ...props}) => <Title order={4} mb="md" {...props} />,
        h5: ({node, ...props}) => <Title order={5} mb="md" {...props} />,
        h6: ({node, ...props}) => <Title order={6} mb="md" {...props} />,

        // Text elements
        p: ({node, ...props}) => <Text mb="md" {...props} />,
        strong: ({node, ...props}) => <Text fw={700} component="strong" {...props} />,
        em: ({node, ...props}) => <Text fs="italic" component="em" {...props} />,
        a: ({node, ...props}) => <Anchor {...props} />,

        // Lists
        ul: ({node, ...props}) => <List mb="md" {...props} type="unordered" />,
        ol: ({node, ...props}) => <List mb="md" {...props} type="ordered" />,
        li: ({node, ...props}) => <ListItem {...props} />,

        // Code blocks
        code: ({node, className, ...props}) => {
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <Code block {...props} />
          ) : (
            <Code {...props} />
          );
        },

        // Blockquotes
        blockquote: ({node, ...props}) => (
          <Blockquote mb="md" {...props} />
        ),

        // Horizontal rule
        hr: ({node, ...props}) => <Divider my="xl" {...props} />,

        // Tables (if needed)
        table: ({node, ...props}) => (
          <div style={{ overflowX: 'auto' }}>
            <table {...props} />
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
