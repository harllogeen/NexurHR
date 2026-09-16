import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
 selector: 'app-training',
 imports: [CommonModule],
 templateUrl: './training.html',
 styleUrl: './training.css',
})
export class Training {

  // ============ LOGO & COMPANY ============
  @Input() logoSymbol: string = 'TF';
  @Input() companyName: string = 'TechFlow Inc.';
  @Input() companyTagline: string = 'Innovation at Work';
  @Input() primaryColor: string = '#1a365d';
  @Input() logoColor: string = '#2b6cb0';

//   subject: string = 'Welcome to TechFlow!';
  salutation: string = 'Dear John ,';
  closing: string = 'Best regards,';
  senderName: string = 'Jane Smith';
  footerText: string = 'TechFlow Inc. • All Rights Reserved';

  bodyParagraphs: string[] = [
    'We are thrilled to welcome you to the TechFlow family! Your account has been successfully created and you can now access our platform.',
    'To get started, please log in to your dashboard using the credentials you received in a separate email. You\'ll find everything you need to begin your journey with us.',
    'If you have any questions or need assistance, our support team is here to help 24/7. Feel free to reach out anytime.',
    'We look forward to helping you achieve your goals!'
  ];

}
