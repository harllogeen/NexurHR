import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit {
  isSidebarOpen = true;
  isCollapsed = false;
  isEmployeesMenuOpen = false;
  isLeaveMenuOpen = false;
  isAttendanceMenuOpen = false;
  isTasksMenuOpen = false;
  isProjectsMenuOpen = false;
  isPerformanceMenuOpen = false;
  isConfigMenuOpen = false;

  user$;
  currentUser: any = null;
  notifications: any[] = [];
  activeNotificationTab: 'all' | 'unread' | 'read' = 'all';
  themeService = inject(ThemeService);

  constructor(
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService,
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.notificationService.loadMyNotifications();
      }
    });

    this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.isEmployeesMenuOpen = false;
      this.isLeaveMenuOpen = false;
      this.isAttendanceMenuOpen = false;
      this.isTasksMenuOpen = false;
      this.isProjectsMenuOpen = false;
      this.isPerformanceMenuOpen = false;
      this.isConfigMenuOpen = false;
    }
  }

  private closeAllMenusExcept(menu: string) {
    if (menu !== 'employees') this.isEmployeesMenuOpen = false;
    if (menu !== 'leave') this.isLeaveMenuOpen = false;
    if (menu !== 'attendance') this.isAttendanceMenuOpen = false;
    if (menu !== 'tasks') this.isTasksMenuOpen = false;
    if (menu !== 'projects') this.isProjectsMenuOpen = false;
    if (menu !== 'performance') this.isPerformanceMenuOpen = false;
    if (menu !== 'config') this.isConfigMenuOpen = false;
  }

  toggleEmployeesMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('employees');
        this.isEmployeesMenuOpen = true;
      }, 150);
    } else {
      this.isEmployeesMenuOpen = !this.isEmployeesMenuOpen;
      if (this.isEmployeesMenuOpen) {
        this.closeAllMenusExcept('employees');
      }
    }
  }

  toggleLeaveMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('leave');
        this.isLeaveMenuOpen = true;
      }, 150);
    } else {
      this.isLeaveMenuOpen = !this.isLeaveMenuOpen;
      if (this.isLeaveMenuOpen) {
        this.closeAllMenusExcept('leave');
      }
    }
  }

  toggleAttendanceMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('attendance');
        this.isAttendanceMenuOpen = true;
      }, 150);
    } else {
      this.isAttendanceMenuOpen = !this.isAttendanceMenuOpen;
      if (this.isAttendanceMenuOpen) {
        this.closeAllMenusExcept('attendance');
      }
    }
  }

  toggleTasksMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('tasks');
        this.isTasksMenuOpen = true;
      }, 300);
    } else {
      this.isTasksMenuOpen = !this.isTasksMenuOpen;
      if (this.isTasksMenuOpen) {
        this.closeAllMenusExcept('tasks');
      }
    }
  }

  toggleProjectsMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('projects');
        this.isProjectsMenuOpen = true;
      }, 300);
    } else {
      this.isProjectsMenuOpen = !this.isProjectsMenuOpen;
      if (this.isProjectsMenuOpen) {
        this.closeAllMenusExcept('projects');
      }
    }
  }

  togglePerformanceMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('performance');
        this.isPerformanceMenuOpen = true;
      }, 300);
    } else {
      this.isPerformanceMenuOpen = !this.isPerformanceMenuOpen;
      if (this.isPerformanceMenuOpen) {
        this.closeAllMenusExcept('performance');
      }
    }
  }

  toggleConfigMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      setTimeout(() => {
        this.closeAllMenusExcept('config');
        this.isConfigMenuOpen = true;
      }, 300);
    } else {
      this.isConfigMenuOpen = !this.isConfigMenuOpen;
      if (this.isConfigMenuOpen) {
        this.closeAllMenusExcept('config');
      }
    }
  }

  showNotifications = false;

  get filteredNotifications() {
    if (this.activeNotificationTab === 'unread') {
      return this.notifications.filter(n => !n.read);
    } else if (this.activeNotificationTab === 'read') {
      return this.notifications.filter(n => n.read);
    }
    return this.notifications;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  markAsRead(notification: any) {
    if (notification.read) return; // Already read
    
    // Optimistically mark as read
    notification.read = true;
    
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        // Successfully marked as read on server, maybe reload to be safe
        this.notificationService.loadMyNotifications();
      },
      error: (err) => {
        console.error('Failed to mark notification as read', err);
        // Revert on error
        notification.read = false;
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }

  logout() {
    this.authService.logout();
  }
}
