import { faker } from '@faker-js/faker';
import { ContactPayload, IFactory } from '../../types';

export class ContactFactoryClass implements IFactory<ContactPayload> {
  build(overrides?: Partial<ContactPayload>): ContactPayload {
    return {
      name: faker.person.fullName(),
      phone: `+91${faker.number.int({ min: 6000000000, max: 9999999999 })}`,
      email: faker.internet.email(),
      company: faker.company.name(),
      status: 'active',
      ...overrides,
    };
  }

  buildMany(count: number, overrides?: Partial<ContactPayload>): ContactPayload[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  buildScenario(scenario: string): ContactPayload {
    switch (scenario) {
      case 'duplicate':
        return {
          name: 'Duplicate Contact',
          phone: '+919999999999',
          email: 'duplicate@example.com',
          company: 'Duplicate Corp',
          status: 'active',
        };
      case 'maxFields':
        return {
          name: 'A'.repeat(255),
          phone: '+91' + '9'.repeat(10),
          email: 'B'.repeat(100) + '@example.com',
          company: 'C'.repeat(255),
          status: 'active',
        };
      case 'missingEmail':
        return this.build({ email: null });
      case 'international':
        return {
          name: 'François Müller-Rousseau',
          phone: '+447911123456',
          email: 'francois.muller@example.co.uk',
          company: 'Müller & Co AG',
          status: 'active',
        };
      default:
        throw new Error(`Unknown Contact scenario: ${scenario}`);
    }
  }
}

export const ContactFactory = new ContactFactoryClass();
