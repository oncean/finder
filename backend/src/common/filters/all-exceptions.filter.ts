import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : '服务器内部错误';
    const message = typeof exceptionResponse === 'string'
      ? exceptionResponse
      : (exceptionResponse as any).message || '服务器错误';

    console.error('请求错误:', {
      path: request.url,
      method: request.method,
      status,
      message: exceptionResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const body: Record<string, any> = {
      code: status,
      message,
    };

    if (typeof exceptionResponse !== 'string') {
      const responseData = (exceptionResponse as any).data;
      if (responseData !== undefined) {
        body.data = responseData;
      }
    }

    response.status(status).json(body);
  }
}
