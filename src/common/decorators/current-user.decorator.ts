import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If no specific property requested, return full user
    if (!data) {
      return user;
    }

    // Handle special case: 'sub' means the user's database ID
    // This is for backwards compatibility with code expecting Clerk's 'sub'
    if (data === 'sub') {
      return user?.id;
    }

    // Return specific property if requested
    return user?.[data];
  },
);
