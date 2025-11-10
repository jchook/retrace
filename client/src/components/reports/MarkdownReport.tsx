import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    lineHeight: 1.4,
  },
  text: {
    color: '#212529',
  },
});

interface MarkdownReportProps {
  data: string;
}

const MarkdownReport = ({ data }: MarkdownReportProps) => (
  <Document>
    <Page style={styles.page}>
      <Text style={styles.text}>{data}</Text>
    </Page>
  </Document>
);

export default MarkdownReport;
