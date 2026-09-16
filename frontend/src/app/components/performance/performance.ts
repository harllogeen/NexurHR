import { AlertService } from '../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './performance.html',
  styleUrl: './performance.css',
})
export class Performance implements OnInit {
  private alertService = inject(AlertService);
  user: any;
  myPerformance: any[] = [];
  teamPerformance: any[] = [];
  allPerformance: any[] = [];
  employees: any[] = [];
  loading = false;
  currentView: string = 'my';

  newGoal = {
    title: '',
    description: '',
    deadline: '',
    reviewCycle: 'Quarterly',
    selfReview: '',
    managerReview: '',
    rating: '',
    comments: '',
    progress: 0,
    keyResults: [] as {title: string, completed: boolean}[],
    userId: '',
  };
  newKrTitle = '';

  reviewDrafts: Record<string, any> = {};
  newFeedbackText: Record<string, string> = {};
  showFeedbackModalFor: string | null = null;

  // Pagination
  myPerformancePage = 1;
  teamPerformancePage = 1;
  allPerformancePage = 1;
  pageSize = 10;

  get paginatedMyPerformance(): any[] {
    const start = (this.myPerformancePage - 1) * this.pageSize;
    return this.myPerformance.slice(start, start + this.pageSize);
  }

  get myPerformanceTotalPages(): number {
    return Math.ceil(this.myPerformance.length / this.pageSize) || 1;
  }
  
  get paginatedTeamPerformance(): any[] {
    const start = (this.teamPerformancePage - 1) * this.pageSize;
    return this.teamPerformance.slice(start, start + this.pageSize);
  }

  get teamPerformanceTotalPages(): number {
    return Math.ceil(this.teamPerformance.length / this.pageSize) || 1;
  }

  get paginatedAllPerformance(): any[] {
    const start = (this.allPerformancePage - 1) * this.pageSize;
    return this.allPerformance.slice(start, start + this.pageSize);
  }

  get allPerformanceTotalPages(): number {
    return Math.ceil(this.allPerformance.length / this.pageSize) || 1;
  }

  goToPage(table: 'my' | 'team' | 'all', page: number) {
    if (table === 'my') {
      this.myPerformancePage = Math.max(1, Math.min(page, this.myPerformanceTotalPages));
    } else if (table === 'team') {
      this.teamPerformancePage = Math.max(1, Math.min(page, this.teamPerformanceTotalPages));
    } else {
      this.allPerformancePage = Math.max(1, Math.min(page, this.allPerformanceTotalPages));
    }
  }

  getPageNumbers(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  isView(view: string): boolean {
    return this.currentView === view;
  }

  expandedGoalId: string | null = null;

  toggleGoalExpand(goalId: string) {
    this.expandedGoalId = this.expandedGoalId === goalId ? null : goalId;
  }

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      this.currentView = params['view'] || 'my';
    });
    this.loadEmployees();
    this.authService.user$.subscribe((u) => {
      this.user = u;
      if (this.user) {
        this.loadMyPerformance();
        this.loadTeamPerformance();
        if (this.user.role === 'hr' || this.user.role === 'manager') {
          this.loadAllPerformance();
        }
      }
    });
  }

  loadEmployees() {
    this.api.get('employees').subscribe({
      next: (data: any) => {
        this.employees = data;
      },
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  getEmployeeName(userId: number): string {
    const employee = this.employees.find(emp => emp.id === userId);
    if (employee) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return `User #${userId}`;
  }

  getEmployeeInitials(userId: number): string {
    const employee = this.employees.find(emp => emp.id === userId);
    if (employee) {
      return `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`;
    }
    return '#';
  }

  loadMyPerformance() {
    this.loading = true;
    this.performanceService.getMyPerformance().subscribe({
      next: (data: any) => {
        this.myPerformance = data.reverse();
        this.myPerformance.forEach((goal) => {
          this.reviewDrafts[goal.id] = {
            selfReview: goal.selfReview || '',
            managerReview: goal.managerReview || '',
            rating: goal.rating || '',
            comments: goal.comments || '',
            progress: goal.progress || 0
          };
        });
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
  
  loadTeamPerformance() {
    this.performanceService.getTeamPerformance().subscribe({
      next: (data: any) => {
        this.teamPerformance = data.reverse();
        this.teamPerformance.forEach((goal) => {
          this.newFeedbackText[goal.id] = '';
        });
      },
      error: (err) => console.error(err),
    });
  }

  loadAllPerformance() {
    this.performanceService.getAllPerformance().subscribe({
      next: (data: any) => {
        this.allPerformance = data.reverse();
        this.allPerformance.forEach((goal) => {
          this.reviewDrafts[goal.id] = {
            selfReview: goal.selfReview || '',
            managerReview: goal.managerReview || '',
            rating: goal.rating || '',
            comments: goal.comments || '',
            progress: goal.progress || 0
          };
          this.newFeedbackText[goal.id] = '';
        });
      },
      error: (err) => console.error(err),
    });
  }

  addKeyResult() {
    if (this.newKrTitle.trim()) {
      this.newGoal.keyResults.push({ title: this.newKrTitle.trim(), completed: false });
      this.newKrTitle = '';
    }
  }

  removeKeyResult(index: number) {
    this.newGoal.keyResults.splice(index, 1);
  }

  submitGoal() {
    if (!this.newGoal.title) {
      this.alertService.showAlert('error', 'Error', 'Please enter a goal title');
      return;
    }
    this.loading = true;
    this.performanceService.createGoal(this.newGoal).subscribe({
      next: () => {
        this.loadMyPerformance();
        this.newGoal = {
          title: '',
          description: '',
          deadline: '',
          reviewCycle: 'Quarterly',
          selfReview: '',
          managerReview: '',
          rating: '',
          comments: '',
          progress: 0,
          keyResults: [],
          userId: '',
        };
        this.loading = false;
      },
      error: (err) => {
        this.alertService.showAlert('error', 'Error', err.error.message || 'Error creating goal');
        this.loading = false;
      },
    });
  }

  saveReview(goal: any) {
    const draft = this.reviewDrafts[goal.id] || {};
    const updates = {
      selfReview: draft.selfReview || '',
      managerReview: draft.managerReview || '',
      rating: draft.rating ? Number(draft.rating) : null,
      comments: draft.comments || '',
    };

    this.loading = true;
    this.performanceService.updatePerformance(goal.id, updates).subscribe({
      next: () => {
        this.loadAllPerformance();
        this.loadMyPerformance();
        this.loading = false;
      },
      error: (err) => {
        this.alertService.showAlert('error', 'Error', err.error.message || 'Error saving review');
        this.loading = false;
      },
    });
  }

  updateProgress(goal: any, newProgress: number) {
    this.performanceService.updatePerformance(goal.id, { progress: newProgress }).subscribe({
      next: () => {
        goal.progress = newProgress;
      },
      error: (err) => {
        this.alertService.showAlert('error', 'Error', err.error.message || 'Error updating progress');
      }
    });
  }

  submitFeedback(goalId: string) {
    const text = this.newFeedbackText[goalId];
    if (!text || !text.trim()) return;

    this.loading = true;
    this.performanceService.addFeedback(goalId, text).subscribe({
      next: () => {
        this.newFeedbackText[goalId] = '';
        this.showFeedbackModalFor = null;
        this.loadAllPerformance();
        this.loadMyPerformance();
        this.loading = false;
        this.alertService.showAlert('info', 'Alert', 'Feedback submitted anonymously.');
      },
      error: (err) => {
        this.alertService.showAlert('error', 'Error', err.error.message || 'Error submitting feedback');
        this.loading = false;
      }
    });
  }

  updateGoalStatus(id: any, status: string) {
    this.performanceService.updatePerformance(id, { status }).subscribe({
      next: () => {
        this.loadAllPerformance();
        this.loadMyPerformance();
      },
      error: (err) => this.alertService.showAlert('error', 'Error', err.error.message || 'Error updating status'),
    });
  }
}
