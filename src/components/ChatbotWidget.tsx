import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, X, ArrowDown, FileQuestion, Send } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { ChatMessage, EDUCATION_ONLY_RESPONSE, isEducationalPrompt, ProfileSignals, sendChatToAssistant } from '@/services/chatbot';
import { cn } from '@/lib/utils';
import { QuizGenerator } from './QuizGenerator';

const STORAGE_KEY = 'study-coach-chat-history-v2';
const OPEN_STATE_KEY = 'spark-chat-open';

const defaultProfileSignals: ProfileSignals = {
  recentSubjects: [],
  mastery: {},
  weakConcepts: [],
  quizAccuracy: 0,
  dailyPlan: '',
  nextSession: '',
  timetableEntry: '',
  bookmarks: [],
  recommendedVideos: [],
  courseProgress: {},
};

const introMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Hey there! I am your Study Coach. I can help with concepts, study plans, quizzes, prep strategies, and more educational doubts to help you manage your time better.',
  timestamp: Date.now(),
};

export function ChatbotWidget() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const hiddenPaths = [
    '/',
    '/student/login',
    '/student/signup',
    '/mentor/login',
    '/mentor/signup',
    '/login',
    '/signup'
  ];

  const isHidden = hiddenPaths.includes(location.pathname);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ChatMessage[];
      } catch (error) {
        console.error('Failed to parse stored chat history', error);
      }
    }
    return [introMessage];
  });

  const [isOpen, setIsOpen] = useState(() => {
    const stored = sessionStorage.getItem(OPEN_STATE_KEY);
    return stored ? stored === 'true' : false;
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const profileSignals = useMemo(() => {
    if (!user) return defaultProfileSignals;
    return { ...defaultProfileSignals };
  }, [user]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(OPEN_STATE_KEY, JSON.stringify(isOpen));
  }, [isOpen]);

  // Listen for external commands to open chat with context
  useEffect(() => {
    const handleOpenWithContext = (e: CustomEvent<{ context: string }>) => {
      setIsOpen(true);
      setInput(e.detail.context);
      // Optional: Focus logic could go here
    };


    window.addEventListener('open-chatbot-with-context', handleOpenWithContext as EventListener);
    return () => {
      window.removeEventListener('open-chatbot-with-context', handleOpenWithContext as EventListener);
    };
  }, []);

  // Clear chat history when user logs out
  useEffect(() => {
    // If not loading and no user, we consider it a logged-out state.
    // We clear the specific storage key for the chatbot history.
    if (!loading && !user) {
      sessionStorage.removeItem(STORAGE_KEY);
      setMessages([introMessage]);
    }
  }, [user, loading]);

  useEffect(() => {
    if (!scrollRef.current || !isOpen) return;
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [messages, isOpen]);

  // Also scroll when typing indicator appears/disappears
  useEffect(() => {
    if (!scrollRef.current || !isOpen) return;
    if (isTyping) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }
  }, [isTyping, isOpen]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    // Use scrollTop for more reliable scrolling
    el.scrollTop = el.scrollHeight;
    // Also use scrollTo as fallback
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    setShowScrollButton(!nearBottom);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    if (!isEducationalPrompt(trimmed)) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: EDUCATION_ONLY_RESPONSE, timestamp: Date.now() },
      ]);
      return;
    }

    setIsTyping(true);
    try {
      const response = await sendChatToAssistant(trimmed, [...messages, userMessage], profileSignals);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      // Ensure scroll happens after state update
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const typingIndicator = (
    <div className="flex flex-col items-start gap-1">
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.2s]" />
      </div>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Study Coach · typing</span>
    </div>
  );

  const handleToggle = () => setIsOpen((prev) => !prev);

  if (loading || !user || isHidden) return null;

  return (
    <>
      <Button
        className={cn(
          'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all',
          isOpen ? 'scale-90 opacity-0 pointer-events-none' : 'hover:shadow-xl'
        )}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Chat with AI study assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-h-[80vh] flex-col rounded-3xl border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between rounded-t-3xl border-b bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-semibold">Study Coach</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
              onClick={handleToggle}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>



          <div className="relative flex-1 overflow-hidden flex flex-col">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
            >
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`msg-${message.timestamp}-${index}-${message.role}`}
                    className={cn(
                      'flex flex-col gap-1',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        message.role === 'user'
                          ? 'rounded-br-sm bg-primary text-primary-foreground'
                          : 'rounded-bl-sm bg-muted text-foreground'
                      )}
                    >
                      {message.role === 'user' ? (
                        message.content
                      ) : (
                        <Markdown
                          options={{
                            overrides: {
                              ul: { props: { className: 'list-disc pl-4 mb-2' } },
                              ol: { props: { className: 'list-decimal pl-4 mb-2' } },
                              p: { props: { className: 'mb-2 last:mb-0' } },
                            },
                          }}
                          className="prose prose-sm dark:prose-invert max-w-none break-words"
                        >
                          {String(message.content || '')}
                        </Markdown>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {message.role === 'user' ? 'You' : 'Study Coach'} · {formatTime(message.timestamp)}
                    </span>
                  </div>
                ))}
                {isTyping && typingIndicator}
              </div>
            </div>

            {showScrollButton && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 h-8 w-8 rounded-full shadow"
                onClick={() => scrollToBottom()}
                aria-label="Scroll to latest message"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          <footer className="border-t bg-background px-4 py-3 space-y-2">

            <div className="rounded-2xl border bg-muted/20 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Ask about concepts, quizzes, or study plans
              </p>
              <div className="mt-2 flex gap-2">
                <Textarea
                  disabled={isTyping}
                  placeholder="Type your question… (Shift+Enter for a new line)"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  className="min-h-[40px] resize-none flex-1 py-3"
                />
                <Button
                  size="icon"
                  className="h-auto w-10 shrink-0"
                  onClick={handleSend}
                  disabled={isTyping || !input.trim()}
                >
                  {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground">
                  Education-only guardrails active. Powered by Google Gemini.
                </span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {showQuiz && <QuizGenerator onClose={() => setShowQuiz(false)} />}
    </>
  );
}
