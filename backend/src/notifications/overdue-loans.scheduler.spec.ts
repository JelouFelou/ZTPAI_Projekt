import { NotificationsService } from './notifications.service.js';
import { OverdueLoansScheduler } from './overdue-loans.scheduler.js';

describe('OverdueLoansScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs at 9am and schedules the following daily check', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T08:59:00'));
    const notifications = {
      recordOverdueReminders: vi.fn().mockResolvedValue(0),
    };
    const scheduler = new OverdueLoansScheduler(
      notifications as unknown as NotificationsService,
    );

    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(notifications.recordOverdueReminders).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(notifications.recordOverdueReminders).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(notifications.recordOverdueReminders).toHaveBeenCalledTimes(3);
    scheduler.onModuleDestroy();
  });

  it('checks missed reminders on startup and schedules the next 9am check', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T10:00:00'));
    const notifications = {
      recordOverdueReminders: vi.fn().mockResolvedValue(0),
    };
    const scheduler = new OverdueLoansScheduler(
      notifications as unknown as NotificationsService,
    );

    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(notifications.recordOverdueReminders).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000);
    expect(notifications.recordOverdueReminders).toHaveBeenCalledTimes(2);
    scheduler.onModuleDestroy();
  });
});
