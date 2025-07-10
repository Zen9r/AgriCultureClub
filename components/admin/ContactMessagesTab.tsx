'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, Mail, Phone } from 'lucide-react';

// --- Types ---
// ## تحديث: تم تعديل النوع ليشمل title و subject الجديد ##
type ContactMessage = {
  id: number;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  title: string; // العنوان النصي
  subject: string | null; // الموضوع من القائمة
  message_body: string;
  is_read: boolean;
};

export default function ContactMessagesTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async (currentSelection: ContactMessage | null) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("فشل جلب الرسائل.");
    } else {
      const newMessages = data || [];
      setMessages(newMessages);
      // إذا لم يكن هناك رسالة محددة، أو إذا كانت الرسالة المحددة لم تعد موجودة، حدد أول رسالة في القائمة
      if (newMessages.length > 0 && (!currentSelection || !newMessages.find(m => m.id === currentSelection.id))) {
        handleSelectMessage(newMessages[0], newMessages);
      } else if (newMessages.length === 0) {
        setSelectedMessage(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages(selectedMessage);
  }, []);

  const handleSelectMessage = async (message: ContactMessage, currentMessages = messages) => {
    setSelectedMessage(message);

    if (!message.is_read) {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', message.id);

      if (error) {
        toast.error("فشل تحديث حالة الرسالة.");
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === message.id ? { ...m, is_read: true } : m
          )
        );
      }
    }
  };

  return (
    <div dir="rtl" className="h-[calc(100vh-8rem)]">
      <Card className="h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
          {/* Message List Panel */}
          <div className="col-span-1 border-l">
            <CardHeader>
              <CardTitle>البريد الوارد</CardTitle>
              <CardDescription>جميع الرسائل الواردة.</CardDescription>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-[calc(100%-8rem)]">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>
                ) : messages.length > 0 ? (
                  messages.map(message => (
                    <button
                      key={message.id}
                      onClick={() => handleSelectMessage(message)}
                      className={cn(
                        "w-full text-right p-3 rounded-lg flex flex-col gap-1 transition-colors border-r-4",
                        selectedMessage?.id === message.id
                          ? "bg-primary text-primary-foreground border-primary-foreground/50"
                          : "hover:bg-accent",
                        !message.is_read && selectedMessage?.id !== message.id 
                          ? "bg-muted border-primary"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{message.full_name}</p>
                        {!message.is_read && <Badge variant="default" className="bg-primary/80">جديد</Badge>}
                      </div>
                      {/* ## تحديث: عرض حقل العنوان الجديد هنا ## */}
                      <p className="text-sm truncate font-medium">{message.title || "بدون عنوان"}</p>
                      <p className="text-xs text-muted-foreground self-end mt-1">
                        {format(new Date(message.created_at), 'Pp', { locale: arSA })}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">لا توجد رسائل.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message Content Panel */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <AnimatePresence>
              {selectedMessage ? (
                <motion.div
                  key={selectedMessage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 h-full flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12"><AvatarFallback>{selectedMessage.full_name.charAt(0)}</AvatarFallback></Avatar>
                    <div className="grid gap-1">
                      <p className="font-semibold">{selectedMessage.full_name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <a href={`mailto:${selectedMessage.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-3 w-3" />{selectedMessage.email}</a>
                        {selectedMessage.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{selectedMessage.phone}</div>}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    {/* ## تحديث: عرض العنوان والموضوع (كشارة) ## */}
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-bold">{selectedMessage.title}</h2>
                        {selectedMessage.subject && <Badge variant="outline">{selectedMessage.subject}</Badge>}
                    </div>
                    <ScrollArea className="h-[calc(100vh-22rem)]">
                        <p className="text-base leading-relaxed whitespace-pre-wrap">{selectedMessage.message_body}</p>
                    </ScrollArea>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Inbox className="h-16 w-16" />
                  <p className="mt-4">الرجاء اختيار رسالة لعرضها.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}