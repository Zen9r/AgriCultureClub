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
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Mail, Phone, ArrowRight, ChevronLeft, ExternalLink } from 'lucide-react';

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
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

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
      // On desktop, auto-select first message
      if (newMessages.length > 0 && (!currentSelection || !newMessages.find(m => m.id === currentSelection.id)) && window.innerWidth >= 768) {
        handleSelectMessage(newMessages[0], newMessages, false);
      } else if (newMessages.length === 0) {
        setSelectedMessage(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages(selectedMessage);
  }, []);

  const handleSelectMessage = async (message: ContactMessage, currentMessages = messages, openMobileView = true) => {
    setSelectedMessage(message);
    
    // On mobile, switch to detail view
    if (window.innerWidth < 768 && openMobileView) {
      setIsMobileDetailView(true);
    }

    if (!message.is_read) {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', message.id);

      if (error) {
        toast.error("فشل تحديث حالة الرسالة.");
      } else {
        // Animate the read status change
        setMessages(prev =>
          prev.map(m =>
            m.id === message.id ? { ...m, is_read: true } : m
          )
        );
      }
    }
  };

  const handleBackToList = () => {
    setIsMobileDetailView(false);
  };

  // Message List Component
  const MessageList = () => (
    <div className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">البريد الوارد</CardTitle>
            <CardDescription className="text-sm">
              {messages.filter(m => !m.is_read).length} رسالة جديدة
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1 h-[calc(100vh-16rem)]">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary"/>
              <p className="text-sm text-muted-foreground">جاري تحميل الرسائل...</p>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message, index) => (
              <motion.button
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => handleSelectMessage(message)}
                className={cn(
                  "w-full text-right p-4 rounded-xl flex flex-col gap-2 transition-all touch-manipulation",
                  "border-2 hover:shadow-md active:scale-[0.98]",
                  selectedMessage?.id === message.id
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-400 shadow-md"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300",
                  !message.is_read && "border-l-4 border-l-green-500"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!message.is_read && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"
                      />
                    )}
                    <p className={cn(
                      "font-bold text-base",
                      !message.is_read && "text-green-700 dark:text-green-400"
                    )}>
                      {message.full_name}
                    </p>
                  </div>
                  {!message.is_read && (
                    <Badge variant="default" className="bg-green-500 text-white text-xs flex-shrink-0">
                      جديد
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                  {message.title || "بدون عنوان"}
                </p>
                <div className="flex items-center justify-between gap-2">
                  {message.subject && (
                    <Badge variant="outline" className="text-xs">
                      {message.subject}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), 'Pp', { locale: arSA })}
                  </p>
                </div>
              </motion.button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-lg font-medium mb-2">لا توجد رسائل</p>
              <p className="text-sm text-muted-foreground">لم يتم استلام أي رسائل بعد</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Message Detail Component
  const MessageDetail = () => {
    if (!selectedMessage) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
          <Inbox className="h-20 w-20 mb-4" />
          <p className="text-lg font-medium">الرجاء اختيار رسالة لعرضها</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Mobile Back Button */}
        <div className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-900 border-b p-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            العودة للقائمة
          </Button>
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-16rem)]">
          <motion.div
            key={selectedMessage.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="p-4 md:p-6"
          >
            {/* Sender Header */}
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-14 w-14 flex-shrink-0">
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  {selectedMessage.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg mb-1">{selectedMessage.full_name}</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{selectedMessage.email}</span>
                  </div>
                  {selectedMessage.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{selectedMessage.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Message Title & Subject */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{selectedMessage.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {selectedMessage.subject && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {selectedMessage.subject}
                    </Badge>
                    <span>•</span>
                  </>
                )}
                <span>{format(new Date(selectedMessage.created_at), 'PPpp', { locale: arSA })}</span>
              </div>
            </div>

            {/* Message Body */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-6">
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {selectedMessage.message_body}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pb-4">
              <Button
                asChild
                className="flex-1 h-12 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                <a href={`mailto:${selectedMessage.email}`}>
                  <Mail className="h-4 w-4" />
                  الرد عبر البريد الإلكتروني
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              {selectedMessage.phone && (
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 h-12 gap-2"
                >
                  <a href={`tel:${selectedMessage.phone}`}>
                    <Phone className="h-4 w-4" />
                    اتصال مباشر
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div dir="rtl" className="h-[calc(100vh-8rem)]">
      <Card className="h-full overflow-hidden">
        {/* Mobile View: Either list or detail */}
        <div className="md:hidden h-full">
          <AnimatePresence mode="wait">
            {isMobileDetailView ? (
              <MessageDetail key="detail" />
            ) : (
              <MessageList key="list" />
            )}
          </AnimatePresence>
        </div>

        {/* Desktop View: Two-column layout */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 h-full">
          <div className="col-span-1 border-l dark:border-gray-700 h-full">
            <MessageList />
          </div>
          <div className="col-span-2 lg:col-span-3 h-full overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <MessageDetail key={selectedMessage?.id || 'empty'} />
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}