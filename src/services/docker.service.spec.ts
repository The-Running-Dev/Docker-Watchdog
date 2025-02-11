// src/services/docker.service.spec.ts

import { DockerService, LoggerService } from './';
import { exec, execSync, ExecException, ExecSyncOptions, ChildProcess } from 'child_process';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

jest.mock('child_process', () => {
    const mockExec = jest.fn(
        (cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
            const mockChildProcess = {} as ChildProcess;

            if (typeof callback === 'function') {
                if (cmd.includes('docker images')) {
                    callback(null, 'image1:latest\nimage2:latest\n', '');
                } else if (cmd.includes('docker info')) {
                    callback(null, 'Docker is running', '');
                } else {
                    callback(new Error('Mocked exec error'), '', '');
                }
            }

            return mockChildProcess;
        }
    );

    (mockExec as any).__promisify__ = jest.fn();

    return {
        exec: mockExec,
        execSync: jest.fn((cmd: string, options?: ExecSyncOptions) => {
            if (cmd === 'docker info') {
                if (options?.encoding) {
                    return 'Docker is running'; // Return string when encoding is set
                }
                
                return Buffer.from('Docker is running'); // Return Buffer if no encoding is specified
            }
            
            throw new Error('Docker not running');
        }),
    };
});

describe('DockerService', () => {
    let dockerService: DockerService;
    let loggerService: LoggerService;

    beforeEach(() => {
        jest.clearAllMocks(); // Reset all Jest mocks before each test

        (execSync as jest.MockedFunction<typeof execSync>).mockImplementation(
            ((cmd: string, options?: ExecSyncOptions): string | Buffer => {
                if (cmd === 'docker info') {
                    if (options?.encoding) {
                        return 'Docker is running'; // Return string when encoding is set
                    }
                    return Buffer.from('Docker is running'); // Return Buffer if no encoding is specified
                }

                throw new Error('Docker not running');
            }) as any // Cast to `any` to satisfy Jest's strict type-checking
        );

        // ✅ Ensure exec is properly mocked
        const mockExec = jest.fn(
            (cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess; // Return a valid mock child process

                if (typeof callback === 'function') {
                    if (cmd.includes('docker images')) {
                        callback(null, 'image1:latest\nimage2:latest\n', '');
                    } else {
                        callback(new Error('Mocked exec error'), '', '');
                    }
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        // ✅ Fix: Explicitly add `__promisify__` property to `exec` mock
        (mockExec as any).__promisify__ = jest.fn();

        // Assign the fixed mockExec to Jest's exec mock
        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        loggerService = new LoggerService();
        dockerService = new DockerService(loggerService);
    });
    

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should Check if Docker is Running', () => {
        (execSync as jest.MockedFunction<typeof execSync>).mockReturnValueOnce('Docker is running');

        const result = dockerService.isProcessRunning();

        expect(result).toBe(true);
        expect(execSync).toHaveBeenCalledWith('docker info');
    });

    it('Should return false if Docker is not running', () => {
        (execSync as jest.MockedFunction<typeof execSync>).mockImplementationOnce(() => {
            throw new Error('Docker not running');
        });

        const result = dockerService.isProcessRunning();

        expect(result).toBe(false);
        expect(execSync).toHaveBeenCalledWith('docker info');
    });

    it('Should fetch running images', (done) => {
        const mockImages = 'image1:latest\nimage2:latest\n';

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(null, mockImages, '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getImages((error, images) => {
            expect(error).toBeNull();
            expect(images).toEqual([
                { tag: 'image1', version: 'latest' },
                { tag: 'image2', version: 'latest' },
            ]);

            done();
        });
    });

    it('Should handle error when fetching images', (done) => {
        const mockError = new Error('Error fetching images');

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(mockError, '', '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getImages((error, images) => {
            expect(error).toEqual(mockError);
            expect(images).toEqual([]);
            done();
        });
    });

    it('Should fetch image details', (done) => {
        const mockDetails = 'Image details';

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(null, mockDetails, '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getImageDetails('image1', (error, details) => {
            expect(error).toBeNull();
            expect(details).toEqual(mockDetails);

            done();
        });
    });

    it('Should handle error when fetching image details', (done) => {
        const mockError = new Error('Error fetching image details');

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(mockError, '', '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getImageDetails('image1', (error, details) => {
            expect(error).toEqual(mockError);
            expect(details).toBeNull();

            done();
        });
    });

    it('Should fetch compose config files', (done) => {
        const mockConfigFiles = ['docker-compose.yml'];

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(null, mockConfigFiles.join('\n'), '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getComposeConfigFiles((error, configFiles) => {
            expect(error).toBeNull();
            expect(configFiles).toEqual(mockConfigFiles);
            done();
        });
    });

    it('Should handle error when fetching compose config files', (done) => {
        const mockError = new Error('Error fetching config files');

        const mockExec = jest.fn(
            (_cmd: string, callback?: (error: ExecException | null, stdout: string, stderr: string) => void) => {
                const mockChildProcess = {} as ChildProcess;

                if (typeof callback === 'function') {
                    callback(mockError, '', '');
                }

                return mockChildProcess;
            }
        ) as unknown as jest.MockedFunction<typeof exec>;

        (mockExec as any).__promisify__ = jest.fn();

        (exec as unknown as jest.MockedFunction<typeof exec>) = mockExec;

        dockerService.getComposeConfigFiles((error, configFiles) => {
            expect(error).toEqual(mockError);
            expect(configFiles).toBeNull();

            done();
        });
    });
});