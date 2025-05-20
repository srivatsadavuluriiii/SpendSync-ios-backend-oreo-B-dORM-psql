interface User {
  id: string;
  name: string;
}

class UserService {
  private users: User[] = [];

  @log
  async addUser(user: User): Promise<void> {
    this.users.push(user);
  }

  getUser(id: string): User | null {
    return this.users.find(u => u.id === id) ?? null;
  }
}

function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = await originalMethod.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };
  return descriptor;
}

export default UserService; 