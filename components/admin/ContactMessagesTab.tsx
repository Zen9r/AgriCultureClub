import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ContactMessagesTab() {
  // بيانات وهمية
  const messages = [
    { id: 1, name: 'محمد أحمد', email: 'mohamed@example.com', message: 'أرغب في الاستفسار عن...', date: '2023-10-15' },
    { id: 2, name: 'سارة عبدالله', email: 'sara@example.com', message: 'شكرًا على الفعالية الرائعة...', date: '2023-10-14' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>رسائل التواصل</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الرسالة</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell>{message.name}</TableCell>
                <TableCell>{message.email}</TableCell>
                <TableCell>{message.message}</TableCell>
                <TableCell>{message.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}