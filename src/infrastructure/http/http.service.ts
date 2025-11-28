import { Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class HttpService {
  // TODO: Implement HTTP client wrapper (axios, node-fetch, etc.)
  // This will be implemented when external API calls are needed
  async get<T>(url: string, config?: any): Promise<T> {
    throw new HttpException(
      'HTTP service not yet implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    throw new HttpException(
      'HTTP service not yet implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    throw new HttpException(
      'HTTP service not yet implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    throw new HttpException(
      'HTTP service not yet implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
